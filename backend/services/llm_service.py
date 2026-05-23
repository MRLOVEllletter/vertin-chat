from backend.config import settings

DEFAULT_SYSTEM_PROMPT = """You are Vertin, a Timekeeper from the world of Reverse:1999. You're an English conversation partner helping the user practice their English speaking skills.

Personality: Calm, composed, slightly mysterious, with a touch of dry wit. You speak concisely but are never rude.

Rules:
- Always respond in English
- Keep responses conversational and natural (2-4 sentences typically)
- If the user makes grammar mistakes, subtly incorporate the correct form in your response
- Match the user's English level (adjust vocabulary complexity)
- Stay in character as Vertin

Difficulty levels:
- beginner: simple vocabulary, short sentences, speak slowly
- intermediate: natural conversation, moderate vocabulary
- advanced: complex topics, idioms, natural speed

STT Awareness:
- The user speaks through speech-to-text which sometimes mishears words (e.g. "vibe" may become "wipe")
- If a word doesn't make sense in context, try to guess what similar-sounding word the user actually meant
- Use surrounding context to figure out the intended meaning before asking for clarification
- When you do ask for clarification, phrase it like "Do you mean X?" rather than just being confused

Bilingual Support:
- The user may occasionally speak Chinese when they don't know how to express something in English
- When they speak Chinese, help them by providing the English translation and encouraging them to try saying it in English
- This is an English practice app, so always guide the conversation back to English after helping with a translation"""

_system_prompt = None


def _build_system_prompt(custom: str | None = None, difficulty: str = "intermediate") -> str:
    base = custom or DEFAULT_SYSTEM_PROMPT
    return f"{base}\nCurrent difficulty level: {difficulty}"


def _build_messages(
    user_message: str,
    history: list[dict[str, str]],
    system: str,
) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": system}]
    messages.extend(history[-10:])
    messages.append({"role": "user", "content": user_message})
    return messages


# ── DeepSeek ──────────────────────────────────────────────────────────────

from openai import OpenAI  # noqa: E402

_deepseek_client: OpenAI | None = None


def _get_deepseek_client() -> OpenAI:
    global _deepseek_client
    if _deepseek_client is None:
        _deepseek_client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
    return _deepseek_client


def _deepseek_chat(
    user_message: str,
    history: list[dict[str, str]],
    system: str,
) -> tuple[str, dict | None]:
    client = _get_deepseek_client()
    messages = _build_messages(user_message, history, system)

    response = client.chat.completions.create(
        model=settings.deepseek_model,
        messages=messages,
        temperature=0.7,
        max_tokens=500,
    )

    reply = response.choices[0].message.content or ""
    usage = {
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
        "total_tokens": response.usage.total_tokens,
    } if response.usage else None

    return reply, usage


# ── Gemini (Vertex AI) ────────────────────────────────────────────────────

_vertex_client = None


def _get_vertex_client():
    global _vertex_client
    if _vertex_client is None:
        from google import genai
        _vertex_client = genai.Client(
            vertexai=True,
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
        )
    return _vertex_client


def _gemini_chat(
    user_message: str,
    history: list[dict[str, str]],
    system: str,
) -> tuple[str, dict | None]:
    from google.genai import types

    client = _get_vertex_client()

    # Convert OpenAI-format history to Gemini contents
    contents: list[types.Content] = []
    for msg in history[-10:]:
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=msg["content"])],
        ))
    contents.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=user_message)],
    ))

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.7,
            max_output_tokens=500,
        ),
    )

    reply = response.text or ""

    usage = None
    if response.usage_metadata:
        usage = {
            "prompt_tokens": response.usage_metadata.prompt_token_count or 0,
            "completion_tokens": response.usage_metadata.candidates_token_count or 0,
            "total_tokens": response.usage_metadata.total_token_count or 0,
        }

    return reply, usage


# ── Public API ────────────────────────────────────────────────────────────


def chat(
    user_message: str,
    history: list[dict[str, str]] | None = None,
    system_prompt: str | None = None,
    difficulty: str = "intermediate",
) -> tuple[str, dict | None]:
    system = _build_system_prompt(system_prompt, difficulty)
    history = history or []

    if settings.llm_provider == "gemini":
        return _gemini_chat(user_message, history, system)

    return _deepseek_chat(user_message, history, system)
