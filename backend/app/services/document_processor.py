import io
import uuid
from typing import List, Tuple
import fitz  # PyMuPDF
import tiktoken
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.services.embedding import embedding_service
from app.services.storage import storage_service
import structlog

logger = structlog.get_logger()

CHUNK_SIZE = 800
CHUNK_OVERLAP = 200


def extract_text_from_pdf(pdf_bytes: bytes) -> List[Tuple[int, str]]:
    """Extract text from PDF, returning list of (page_number, text) tuples."""
    pages = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        if text.strip():
            pages.append((page_num + 1, text.strip()))
    doc.close()
    return pages


def chunk_text(pages: List[Tuple[int, str]], chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[dict]:
    """Split extracted text into overlapping chunks."""
    enc = tiktoken.encoding_for_model("gpt-4o")
    chunks = []
    current_chunk = ""
    current_page = None
    chunk_index = 0

    for page_num, text in pages:
        paragraphs = text.split("\n\n")
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            test_chunk = f"{current_chunk}\n\n{para}" if current_chunk else para
            token_count = len(enc.encode(test_chunk))

            if token_count > chunk_size and current_chunk:
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": current_chunk.strip(),
                    "page_number": current_page,
                    "token_count": len(enc.encode(current_chunk.strip())),
                })
                chunk_index += 1

                # Overlap: keep last portion of current chunk
                words = current_chunk.split()
                overlap_words = words[-overlap:] if len(words) > overlap else words
                current_chunk = " ".join(overlap_words) + "\n\n" + para
                current_page = page_num
            else:
                current_chunk = test_chunk
                if current_page is None:
                    current_page = page_num

    if current_chunk.strip():
        chunks.append({
            "chunk_index": chunk_index,
            "content": current_chunk.strip(),
            "page_number": current_page,
            "token_count": len(enc.encode(current_chunk.strip())),
        })

    return chunks


async def process_document(document_id: uuid.UUID, db: AsyncSession):
    """Full document processing pipeline: extract, chunk, embed, store."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        logger.error("Document not found", document_id=str(document_id))
        return

    try:
        document.status = DocumentStatus.PROCESSING
        await db.commit()

        # Download PDF from S3
        pdf_bytes = storage_service.download_file(document.s3_key)

        # Extract text
        pages = extract_text_from_pdf(pdf_bytes)
        document.page_count = len(pages)

        if not pages:
            document.status = DocumentStatus.ERROR
            document.error_message = "No text could be extracted from the PDF"
            await db.commit()
            return

        # Chunk the text
        chunks = chunk_text(pages)

        # Generate embeddings (only when pgvector is available)
        from app.models.document import PGVECTOR_AVAILABLE
        embeddings = None
        if PGVECTOR_AVAILABLE:
            try:
                texts = [c["content"] for c in chunks]
                embeddings = await embedding_service.embed_texts(texts)
            except Exception as emb_err:
                logger.warning(
                    "Generazione embedding fallita, salvataggio chunk senza embedding",
                    error=str(emb_err),
                )

        # Store chunks (with or without embeddings)
        for i, chunk_data in enumerate(chunks):
            db_chunk = DocumentChunk(
                document_id=document.id,
                chunk_index=chunk_data["chunk_index"],
                content=chunk_data["content"],
                page_number=chunk_data["page_number"],
                token_count=chunk_data["token_count"],
                embedding=embeddings[i] if embeddings else None,
            )
            db.add(db_chunk)

        document.chunk_count = len(chunks)
        document.status = DocumentStatus.READY
        await db.commit()

        logger.info(
            "Document processed successfully",
            document_id=str(document_id),
            pages=len(pages),
            chunks=len(chunks),
        )

    except Exception as e:
        document.status = DocumentStatus.ERROR
        document.error_message = str(e)[:500]
        await db.commit()
        logger.error("Document processing failed", document_id=str(document_id), error=str(e))
        raise
