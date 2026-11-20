import os
import httpx
from backend.core.interfaces import LLMProvider, LLMMessage, LLMResponse, LLMUnavailableError


class GeminiProvider(LLMProvider):
    @property
    def provider_id(self) -> str:
        return "gemini"

    async def complete(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        response_mime_type: str = "application/json",
    ) -> LLMResponse:
        api_key = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
        if not api_key:
            raise LLMUnavailableError("GEMINI_API_KEY is not configured in environment.")

        # Transform messages into Gemini API format
        contents = []
        for msg in messages:
            role = "user" if msg.role in {"user", "system"} else "model"
            contents.append({"role": role, "parts": [{"text": msg.content}]})

        models_to_try = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"]
        last_error_text = ""

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "responseMimeType": response_mime_type,
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                try:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidate = data["candidates"][0]
                        text = candidate["content"]["parts"][0]["text"]
                        usage = data.get("usageMetadata", {})

                        return LLMResponse(
                            content=text,
                            model=model_name,
                            prompt_tokens=usage.get("promptTokenCount", 0),
                            completion_tokens=usage.get("candidatesTokenCount", 0),
                        )
                    else:
                        last_error_text = f"{model_name} HTTP {res.status_code}: {res.text}"
                except Exception as ex:
                    last_error_text = str(ex)

        raise LLMUnavailableError(f"Failed to communicate with Gemini API across models: {last_error_text}")
