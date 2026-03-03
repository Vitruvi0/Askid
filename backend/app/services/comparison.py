import uuid
import json
from typing import List
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI
from app.core.config import settings
from app.models.document import Document, DocumentChunk
from app.schemas.document import ComparisonResponse, ComparisonCategory
import structlog

logger = structlog.get_logger()

COMPARISON_SYSTEM_PROMPT = """You are ASKID, an AI assistant specialized in comparing insurance policies.

CRITICAL RULES:
1. ONLY compare based on the provided document contexts. Never use external knowledge.
2. If information is missing from one or both documents, explicitly state it.
3. Never guess or assume coverage details.
4. Maintain professional insurance terminology.

Compare the two policies across these dimensions:
- Coverage scope / Guarantees
- Exclusions
- Deductibles (franchigie)
- Waiting periods (periodi di carenza)
- Territorial limits
- Optional guarantees
- Coverage limits (massimali)

Provide your response as JSON:
{
    "executive_summary": "Brief overview of key differences and similarities",
    "comparison_table": [
        {
            "category": "Coverage Scope",
            "document_1": "Details from Document 1",
            "document_2": "Details from Document 2",
            "notes": "Key difference or observation"
        }
    ],
    "technical_analysis": "Detailed technical comparison",
    "conclusion": "Objective conclusion about which policy offers better coverage in which areas",
    "incomplete_areas": ["Areas where information was insufficient"]
}"""


class ComparisonService:
    def __init__(self):
        client_kwargs = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            client_kwargs["base_url"] = settings.OPENAI_BASE_URL
        self.client = AsyncOpenAI(**client_kwargs)

    async def _get_document_content(self, document_id: uuid.UUID, db: AsyncSession) -> str:
        """Get all chunks of a document concatenated."""
        result = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
        )
        chunks = result.scalars().all()
        return "\n\n".join(c.content for c in chunks)

    async def compare_policies(
        self,
        document_id_1: uuid.UUID,
        document_id_2: uuid.UUID,
        db: AsyncSession,
    ) -> ComparisonResponse:
        """Compare two insurance policy documents."""
        # Get document info
        doc1_result = await db.execute(select(Document).where(Document.id == document_id_1))
        doc2_result = await db.execute(select(Document).where(Document.id == document_id_2))
        doc1 = doc1_result.scalar_one_or_none()
        doc2 = doc2_result.scalar_one_or_none()

        if not doc1 or not doc2:
            raise ValueError("One or both documents not found")

        # Get full content
        content1 = await self._get_document_content(document_id_1, db)
        content2 = await self._get_document_content(document_id_2, db)

        # Truncate if too long (keep within token limits)
        max_chars = 30000
        content1 = content1[:max_chars]
        content2 = content2[:max_chars]

        response = await self.client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": COMPARISON_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"=== DOCUMENT 1: {doc1.original_filename} ===\n\n{content1}\n\n"
                        f"=== DOCUMENT 2: {doc2.original_filename} ===\n\n{content2}\n\n"
                        "Please provide a comprehensive comparison of these two insurance policies."
                    ),
                },
            ],
            temperature=0.1,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )

        try:
            result = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            return ComparisonResponse(
                executive_summary="Error parsing comparison results.",
                comparison_table=[],
                technical_analysis=response.choices[0].message.content,
                conclusion="Insufficient information for complete comparison.",
                incomplete_areas=["Error in structured analysis"],
            )

        comparison_table = [
            ComparisonCategory(**item)
            for item in result.get("comparison_table", [])
        ]

        return ComparisonResponse(
            executive_summary=result.get("executive_summary", ""),
            comparison_table=comparison_table,
            technical_analysis=result.get("technical_analysis", ""),
            conclusion=result.get("conclusion", ""),
            incomplete_areas=result.get("incomplete_areas", []),
        )


comparison_service = ComparisonService()
