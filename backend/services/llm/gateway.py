import hashlib
from typing import Any
from backend.core.config import settings
from backend.core.interfaces import LLMMessage, LLMUnavailableError
from backend.services.llm.providers.gemini import GeminiProvider
from backend.services.llm.providers.openai import OpenAIProvider
from backend.services.llm.repair import repair_and_parse_json


PROVIDER_REGISTRY = {
    "gemini": GeminiProvider,
    "openai": OpenAIProvider,
}

_memory_cache: dict[str, dict[str, Any]] = {}


class LLMGateway:
    def __init__(self):
        provider_cls = PROVIDER_REGISTRY.get(settings.AUTOPATCH_LLM_PROVIDER, GeminiProvider)
        self.provider = provider_cls()

    def _hash_key(self, prompt: str) -> str:
        return hashlib.sha256(prompt.encode("utf-8")).hexdigest()

    async def analyze_and_extract_json(
        self,
        prompt: str,
        system_instruction: str = "You are an autonomous code repair reasoning system. Output strict JSON only.",
    ) -> dict[str, Any] | list[Any]:
        cache_key = self._hash_key(prompt)
        if settings.AUTOPATCH_LLM_CACHE_ENABLED and cache_key in _memory_cache:
            return _memory_cache[cache_key]

        messages = [
            LLMMessage(role="system", content=system_instruction),
            LLMMessage(role="user", content=prompt),
        ]

        last_error = None
        for attempt in range(1, settings.AUTOPATCH_LLM_MAX_RETRIES + 1):
            try:
                response = await self.provider.complete(
                    messages=messages,
                    temperature=settings.AUTOPATCH_LLM_TEMPERATURE,
                    max_tokens=settings.AUTOPATCH_LLM_MAX_TOKENS,
                )

                parsed = repair_and_parse_json(response.content)
                if settings.AUTOPATCH_LLM_CACHE_ENABLED:
                    _memory_cache[cache_key] = parsed
                return parsed

            except (LLMUnavailableError, ValueError) as err:
                last_error = err
                # If JSON parsing failed, ask model to repair
                if isinstance(err, ValueError) and attempt < settings.AUTOPATCH_LLM_MAX_RETRIES:
                    messages.append(
                        LLMMessage(
                            role="user",
                            content=f"Your previous output was invalid JSON: {err}. Please return the exact requested data as valid RFC 8259 JSON only.",
                        )
                    )

        raise LLMUnavailableError(f"LLM Gateway failed after {settings.AUTOPATCH_LLM_MAX_RETRIES} attempts: {last_error}")


llm_gateway = LLMGateway()
