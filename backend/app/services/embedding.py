from typing import List
from openai import AsyncOpenAI
from app.core.config import settings
import structlog

logger = structlog.get_logger()

BATCH_SIZE = 100


class EmbeddingService:
    def __init__(self):
        client_kwargs = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            client_kwargs["base_url"] = settings.OPENAI_BASE_URL
        self.client = AsyncOpenAI(**client_kwargs)
        self.model = settings.OPENAI_EMBEDDING_MODEL
        self.dimensions = settings.OPENAI_EMBEDDING_DIMENSIONS

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts in batches."""
        all_embeddings = []

        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i : i + BATCH_SIZE]
            response = await self.client.embeddings.create(
                input=batch,
                model=self.model,
                dimensions=self.dimensions,
            )
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)

        return all_embeddings

    async def embed_query(self, text: str) -> List[float]:
        """Generate embedding for a single query."""
        response = await self.client.embeddings.create(
            input=[text],
            model=self.model,
            dimensions=self.dimensions,
        )
        return response.data[0].embedding


embedding_service = EmbeddingService()
