import json
from openai import AsyncOpenAI
from app.core.config import settings
from app.schemas.report import ReportRequest, ReportResponse


REPORT_SYSTEM_PROMPT = """You are ASKID, generating professional insurance reports.

Generate three versions of a report based on the provided analysis data:

1. **Technical Report**: Detailed, using industry terminology, for internal use by the insurance agency.
   Include all data points, formulas, and technical details.

2. **Client Report**: Simplified, clear language suitable for the end client.
   Avoid jargon. Explain concepts simply. Focus on actionable insights.

3. **Email Text**: A professional email body that an agent can send to the client.
   Brief, courteous, summarizing key findings with an invitation to discuss further.

Format as JSON:
{
    "technical_report": "Full technical report in markdown",
    "client_report": "Simplified client report in markdown",
    "email_text": "Professional email body text"
}

Use professional Italian-English insurance terminology as appropriate.
Do not include any information not present in the source data."""


class ReportService:
    def __init__(self):
        client_kwargs = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            client_kwargs["base_url"] = settings.OPENAI_BASE_URL
        self.client = AsyncOpenAI(**client_kwargs)

    async def generate_report(self, request: ReportRequest) -> ReportResponse:
        source_description = json.dumps(request.source_data, indent=2, default=str)

        prompt = f"""Generate reports for the following {request.source_type} analysis:

Source Type: {request.source_type}
Client Name: {request.client_name or 'N/A'}
Agency: {request.agency_name or 'N/A'}

Analysis Data:
{source_description}

Generate the three report versions (technical, client, email)."""

        response = await self.client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": REPORT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )

        try:
            result = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            content = response.choices[0].message.content
            result = {
                "technical_report": content,
                "client_report": content,
                "email_text": content,
            }

        return ReportResponse(
            technical_report=result.get("technical_report", ""),
            client_report=result.get("client_report", ""),
            email_text=result.get("email_text", ""),
        )


report_service = ReportService()
