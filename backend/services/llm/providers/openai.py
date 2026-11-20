import os
import httpx
from backend.core.interfaces import LLMProvider, LLMMessage, LLMResponse, LLMUnavailableError


class OpenAIProvider(LLMProvider):
    @property
    def provider_id(self) -> str:
        return "openai"

    async def complete(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        response_mime_type: str = "application/json",
    ) -> LLMResponse:
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            raise LLMUnavailableError("OPENAI_API_KEY is not configured in environment.")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"} if response_mime_type == "application/json" else None,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code != 200:
                    raise LLMUnavailableError(f"OpenAI API returned status {res.status_code}: {res.text}")

                data = res.json()
                choice = data["choices"][0]
                usage = data.get("usage", {})

                return LLMResponse(
                    content=choice["message"]["content"],
                    model="gpt-4o-mini",
                    prompt_tokens=usage.get("prompt_tokens", 0),
                    completion_tokens=usage.get("completion_tokens", 0),
                )
        except Exception as e:
            if isinstance(e, LLMUnavailableError):
                raise
            raise LLMUnavailableError(f"Failed to communicate with OpenAI API: {e}") from e
