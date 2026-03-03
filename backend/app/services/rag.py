import uuid
from typing import List
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI
from app.core.config import settings
from app.models.document import DocumentChunk
from app.services.embedding import embedding_service
from app.schemas.document import QAResponse, SourceChunk
import structlog

logger = structlog.get_logger()

SYSTEM_PROMPT = """You are ASKID, an AI assistant specialized in insurance policy analysis.

CRITICAL RULES:
1. ONLY answer based on the provided context passages. Never use external knowledge.
2. If the information is not found in the context, respond: "I did not find this information in the document."
3. Never guess, assume, or hallucinate information.
4. Do not provide legal advice.
5. Maintain a professional insurance industry tone.

For each answer, you MUST provide:
1. A direct, clear answer to the question
2. The specific section(s) referenced
3. Exact quoted passages from the document that support your answer
4. Any relevant exclusions, limits, or conditions mentioned in the context

Format your response as JSON with these fields:
{
    "answer": "Your direct answer here",
    "referenced_sections": ["Section name or page reference"],
    "quoted_passages": ["Exact quote from the document"],
    "exclusions_and_limits": ["Any exclusions or limits found"],
    "confidence": "high|medium|low"
}

If information is insufficient, set confidence to "low" and explain what's missing in the answer."""


class RAGService:
    def __init__(self):
        client_kwargs = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            client_kwargs["base_url"] = settings.OPENAI_BASE_URL
        self.client = AsyncOpenAI(**client_kwargs)

    async def retrieve_relevant_chunks(
        self,
        query: str,
        document_id: uuid.UUID,
        db: AsyncSession,
        top_k: int = 8,
    ) -> List[dict]:
        """Retrieve the most relevant chunks for a query using pgvector similarity search."""
        query_embedding = await embedding_service.embed_query(query)

        # Use pgvector cosine distance operator
        result = await db.execute(
            text("""
                SELECT id, content, page_number, section_title, chunk_index,
                       1 - (embedding <=> :embedding::vector) as similarity
                FROM document_chunks
                WHERE document_id = :document_id
                ORDER BY embedding <=> :embedding::vector
                LIMIT :top_k
            """),
            {
                "embedding": str(query_embedding),
                "document_id": str(document_id),
                "top_k": top_k,
            },
        )

        rows = result.fetchall()
        chunks = []
        for row in rows:
            chunks.append({
                "id": str(row.id),
                "content": row.content,
                "page_number": row.page_number,
                "section_title": row.section_title,
                "similarity": float(row.similarity),
            })

        return chunks

    async def answer_question(
        self,
        question: str,
        document_id: uuid.UUID,
        db: AsyncSession,
    ) -> QAResponse:
        """Answer a question using RAG on the specified document."""
        chunks = await self.retrieve_relevant_chunks(question, document_id, db)

        if not chunks:
            return QAResponse(
                answer="I did not find this information in the document.",
                referenced_sections=[],
                quoted_passages=[],
                exclusions_and_limits=[],
                sources=[],
                confidence="low",
            )

        # Build context from retrieved chunks
        context_parts = []
        sources = []
        for i, chunk in enumerate(chunks):
            page_info = f" (Page {chunk['page_number']})" if chunk['page_number'] else ""
            section_info = f" [{chunk['section_title']}]" if chunk['section_title'] else ""
            context_parts.append(f"--- Passage {i+1}{page_info}{section_info} ---\n{chunk['content']}")
            sources.append(SourceChunk(
                content=chunk["content"][:500],
                page_number=chunk["page_number"],
                section_title=chunk["section_title"],
                relevance_score=chunk["similarity"],
            ))

        context = "\n\n".join(context_parts)

        # Call LLM with context
        response = await self.client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Context from the insurance document:\n\n{context}\n\n---\n\nQuestion: {question}",
                },
            ],
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        import json
        try:
            result = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            result = {
                "answer": response.choices[0].message.content,
                "referenced_sections": [],
                "quoted_passages": [],
                "exclusions_and_limits": [],
                "confidence": "medium",
            }

        return QAResponse(
            answer=result.get("answer", ""),
            referenced_sections=result.get("referenced_sections", []),
            quoted_passages=result.get("quoted_passages", []),
            exclusions_and_limits=result.get("exclusions_and_limits", []),
            sources=sources,
            confidence=result.get("confidence", "medium"),
        )


rag_service = RAGService()
