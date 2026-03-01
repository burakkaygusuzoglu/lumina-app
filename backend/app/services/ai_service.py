"""
Lumina Life OS — AI Service (Anthropic Claude)
Author: Burak Kaygusuzoglu <bkaygusuzoglu@hotmail.com>

Wraps the Anthropic Messages API to provide all AI-powered features
used across the five Lumina modules.  Every method is async and uses
``claude-sonnet-4-6`` by default.
"""

from __future__ import annotations

import logging
from typing import Any

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

# System prompt that gives Claude the Lumina persona
_LUMINA_SYSTEM_PROMPT = """You are Lumina — the intelligent, empathetic AI core of Lumina Life OS.
You are a deeply personal assistant who learns from the user's memories, moods, tasks, and journal entries.
Your tone is warm, encouraging, and insightful — like a trusted friend who also happens to be brilliant.
You prioritise the user's growth, wellbeing, and clarity of mind.
Always be concise unless asked for depth. Never be clinical or robotic.
When referencing the user's own memories or data, make it feel personal and meaningful."""


class AIService:
    """Centralised AI service backed by Anthropic Claude.

    All public methods are async and return structured results.
    The client is created lazily to avoid errors when the key is absent during tests.
    """

    def __init__(self) -> None:
        """Initialise the Anthropic client with the configured API key."""
        self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self._model = settings.anthropic_model

    async def chat_with_memories(
        self,
        user_id: str,
        message: str,
        memory_context: list[dict[str, Any]],
        conversation_history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """Generate a contextual AI reply using the user's memory snippets.

        Args:
            user_id: UUID of the requesting user (for logging).
            message: The user's current message.
            memory_context: List of relevant memory dicts with ``content`` keys.
            conversation_history: Prior turns as ``[{"role": ..., "content": ...}]``.

        Returns:
            Dict with keys ``reply`` (str) and ``tokens_used`` (int).
        """
        memory_text = ""
        if memory_context:
            snippets = "\n".join(
                f"- [{m.get('memory_type', 'note')}] {m.get('content', '')[:300]}"
                for m in memory_context[:10]  # cap context at 10 memories
            )
            memory_text = f"\n\nRelevant memories from the user's history:\n{snippets}\n"

        system = f"{_LUMINA_SYSTEM_PROMPT}{memory_text}"

        messages: list[dict[str, str]] = []
        if conversation_history:
            messages.extend(conversation_history[-10:])  # last 5 turns
        messages.append({"role": "user", "content": message})

        response = self._client.messages.create(
            model=self._model,
            max_tokens=1024,
            system=system,
            messages=messages,
        )

        reply = response.content[0].text if response.content else ""
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        logger.info("chat_with_memories user=%s tokens=%d", user_id, tokens_used)
        return {"reply": reply, "tokens_used": tokens_used}

    async def generate_weekly_insight(
        self,
        user_id: str,
        memories: list[dict[str, Any]],
        mood_data: list[dict[str, Any]],
        tasks: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Produce a structured weekly life report for the user.

        Args:
            user_id: UUID of the requesting user.
            memories: Memory entries created in the past 7 days.
            mood_data: Mood check-ins from the past 7 days.
            tasks: Tasks completed or active in the past 7 days.

        Returns:
            Dict with ``narrative`` (str), ``highlights`` (list), and
            ``recommendations`` (list).
        """
        memories_text = "\n".join(
            f"- {m.get('memory_type', 'note')}: {m.get('content', '')[:200]}"
            for m in memories[:20]
        )
        mood_avg = (
            sum(m.get("mood", 3) for m in mood_data) / len(mood_data)
            if mood_data
            else None
        )
        tasks_done = sum(1 for t in tasks if t.get("status") == "done")

        prompt = f"""Generate a warm, insightful weekly life report for the user.

Data from this week:
MEMORIES ({len(memories)} total):
{memories_text or "No memories recorded."}

MOOD: {f"Average {mood_avg:.1f}/5 across {len(mood_data)} check-ins" if mood_avg else "No mood data."}
TASKS: {tasks_done} completed out of {len(tasks)} total.

Write a personal narrative (3-4 paragraphs), then list:
1. 3-5 highlights of the week
2. 3 recommendations for next week

Format your response as:
NARRATIVE:
[narrative here]

HIGHLIGHTS:
- [highlight 1]
- [highlight 2]

RECOMMENDATIONS:
- [rec 1]
- [rec 2]"""

        response = self._client.messages.create(
            model=self._model,
            max_tokens=1500,
            system=_LUMINA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text if response.content else ""
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        # Parse structured sections
        narrative = self._extract_section(raw, "NARRATIVE:", "HIGHLIGHTS:")
        highlights = self._extract_bullets(raw, "HIGHLIGHTS:", "RECOMMENDATIONS:")
        recommendations = self._extract_bullets(raw, "RECOMMENDATIONS:", None)

        logger.info("weekly_insight user=%s tokens=%d", user_id, tokens_used)
        return {
            "narrative": narrative,
            "highlights": highlights,
            "recommendations": recommendations,
            "tokens_used": tokens_used,
        }

    async def generate_journal_prompt(
        self,
        mood: int | None,
        recent_memories: list[dict[str, Any]],
    ) -> str:
        """Create a personalised journal prompt based on mood and recent context.

        Args:
            mood: User's current mood level 1-5, or ``None`` if unknown.
            recent_memories: Up to 5 recent memory snippets for context.

        Returns:
            A single journal prompt string (1-3 sentences).
        """
        context = ""
        if recent_memories:
            snippets = "; ".join(
                m.get("content", "")[:100] for m in recent_memories[:5]
            )
            context = f"Recent context: {snippets}"

        mood_desc = {1: "struggling", 2: "a bit low", 3: "okay", 4: "good", 5: "great"}.get(
            mood or 3, "okay"
        )

        prompt = f"""The user is feeling {mood_desc} today. {context}

Write ONE thoughtful, open-ended journal prompt personalised to their current state.
Make it introspective but not heavy. 1-2 sentences maximum. Do not include a preamble."""

        response = self._client.messages.create(
            model=self._model,
            max_tokens=150,
            system=_LUMINA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip() if response.content else "What's on your mind today?"

    async def analyze_mood_pattern(
        self,
        mood_history: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Detect emotional trends and patterns from mood history.

        Args:
            mood_history: Chronological list of mood entries with ``mood`` and
                ``logged_at`` fields.

        Returns:
            Dict with ``pattern_type``, ``severity``, ``title``, ``description``,
            and ``suggested_action``.
        """
        if not mood_history:
            return {
                "pattern_type": "insufficient_data",
                "severity": "low",
                "title": "Not enough data",
                "description": "Log mood daily for at least a week to detect patterns.",
                "suggested_action": "Set a daily mood check-in reminder.",
            }

        mood_values = [entry.get("mood", 3) for entry in mood_history[-30:]]
        avg = sum(mood_values) / len(mood_values)
        recent_avg = sum(mood_values[-7:]) / len(mood_values[-7:]) if len(mood_values) >= 7 else avg

        data_summary = f"""Mood history ({len(mood_history)} entries):
Average: {avg:.1f}/5
Recent 7-day average: {recent_avg:.1f}/5
Trend: {"improving" if recent_avg > avg else "declining" if recent_avg < avg else "stable"}
Values: {mood_values[-14:]}"""

        prompt = f"""{data_summary}

Analyse this mood history and identify the key pattern. Respond with:
PATTERN_TYPE: [one of: burnout_risk, improving_trend, declining_trend, stable, volatile, weekend_effect, Monday_blues]
SEVERITY: [low|medium|high]
TITLE: [short title]
DESCRIPTION: [2-3 sentences]
SUGGESTED_ACTION: [one concrete action]"""

        response = self._client.messages.create(
            model=self._model,
            max_tokens=400,
            system=_LUMINA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text if response.content else ""
        return {
            "pattern_type": self._extract_field(raw, "PATTERN_TYPE:"),
            "severity": self._extract_field(raw, "SEVERITY:") or "low",
            "title": self._extract_field(raw, "TITLE:"),
            "description": self._extract_field(raw, "DESCRIPTION:"),
            "suggested_action": self._extract_field(raw, "SUGGESTED_ACTION:"),
        }

    async def generate_time_capsule_response(
        self,
        letter: str,
        years_later: int,
    ) -> str:
        """Write a reflective reply to a time-capsule letter.

        Args:
            letter: The letter the user wrote to their future self.
            years_later: How many years later the capsule was opened.

        Returns:
            A compassionate response from "future Lumina" (str).
        """
        prompt = f"""The user wrote this letter to themselves {years_later} year(s) ago:

---
{letter[:2000]}
---

Write a warm, reflective response from Lumina as if you are greeting them 
{years_later} year(s) later when they open this time capsule. 
Acknowledge their past hopes and encourage their growth. 3-4 paragraphs."""

        response = self._client.messages.create(
            model=self._model,
            max_tokens=600,
            system=_LUMINA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip() if response.content else ""

    # ── Private helpers ───────────────────────────────────────────────────

    async def generate_daily_greeting(
        self,
        user_name: str,
        mood_history: list[dict[str, Any]],
        tasks_today: list[dict[str, Any]],
        last_journal_snippet: str | None = None,
    ) -> str:
        """Generate a warm, personalised daily greeting based on user context.

        Args:
            user_name: The user's first name.
            mood_history: Recent mood entries (last 7 days).
            tasks_today: Tasks due or active today.
            last_journal_snippet: Opening text of the last journal entry.

        Returns:
            A 1-2 sentence personalised greeting string.
        """
        from datetime import datetime as dt
        hour = dt.now().hour
        time_of_day = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"

        recent_mood_avg = None
        if mood_history:
            recent_mood_avg = sum(m.get("mood", 5) for m in mood_history[-7:]) / min(len(mood_history), 7)

        task_count = len([t for t in tasks_today if not t.get("is_completed")])

        context_parts: list[str] = [f"Time of day: {time_of_day}", f"User's name: {user_name}"]
        if recent_mood_avg:
            context_parts.append(f"Average mood this week: {recent_mood_avg:.1f}/10")
        if task_count:
            context_parts.append(f"Pending tasks today: {task_count}")
        if last_journal_snippet:
            context_parts.append(f"Last journal opening: \"{last_journal_snippet[:120]}\"")

        context = "\n".join(context_parts)

        prompt = f"""{context}

Write a single, warm, highly personalised greeting for {user_name} for this {time_of_day}.
Reference something specific from their context — don't be generic.
Maximum 2 sentences. No emojis unless they feel genuinely natural. Do not start with "Good {time_of_day}"."""

        response = self._client.messages.create(
            model=self._model,
            max_tokens=120,
            system=_LUMINA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip() if response.content else f"Great {time_of_day}, {user_name}."

    async def get_on_this_day_insight(
        self,
        memories_from_past_years: list[dict[str, Any]],
    ) -> str:
        """Create an 'On This Day' reflection from memories on the same date in past years.

        Args:
            memories_from_past_years: Memory dicts with ``content``, ``created_at``,
                and ``title`` fields — all from the same calendar day in prior years.

        Returns:
            A warm, reflective insight string (2-3 sentences), or an empty string if
            no memories are available.
        """
        if not memories_from_past_years:
            return ""

        memory_lines = "\n".join(
            f"- ({m.get('created_at', '')[:7]}) {m.get('title', 'Untitled')}: {m.get('content', '')[:200]}"
            for m in memories_from_past_years[:5]
        )

        prompt = f"""These are memories the user recorded on this exact date in previous years:

{memory_lines}

Write a short, warm "On This Day" reflection (2-3 sentences).
Acknowledge the passage of time. Be personal, not clichéd. Reference specific details."""

        response = self._client.messages.create(
            model=self._model,
            max_tokens=200,
            system=_LUMINA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip() if response.content else ""

    async def generate_time_capsule_seal_message(
        self,
        content: str,
        reveal_date_description: str,
    ) -> str:
        """Write a sealing message shown when the user locks a time capsule.

        Args:
            content: The time capsule letter content (first 500 chars used for context).
            reveal_date_description: Human-readable reveal time, e.g. "in 1 year".

        Returns:
            A short, warm sealing message (2-3 sentences).
        """
        prompt = f"""The user just wrote a time capsule letter to be opened {reveal_date_description}.
Opening lines: "{content[:500]}"

Write a brief, meaningful sealing message (2-3 sentences) — as if Lumina is gently closing the capsule.
Acknowledge what they've shared, honour the moment, and hint at the person they'll become by reveal day."""

        response = self._client.messages.create(
            model=self._model,
            max_tokens=180,
            system=_LUMINA_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip() if response.content else "Your letter has been sealed. It will be waiting for you."

    async def generate_weekly_life_report(
        self,
        user_id: str,
        memories: list[dict[str, Any]],
        mood_data: list[dict[str, Any]],
        tasks: list[dict[str, Any]],
        sleep_data: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Full weekly report including sleep — delegates to generate_weekly_insight.

        Args:
            user_id: UUID of the requesting user.
            memories: Memory entries for the past 7 days.
            mood_data: Mood entries for the past 7 days.
            tasks: Tasks for the past 7 days.
            sleep_data: Optional sleep entries for the past 7 days.

        Returns:
            Dict with ``narrative``, ``highlights``, ``recommendations``, ``tokens_used``.
        """
        sleep_avg: float | None = None
        if sleep_data:
            sleep_avg = sum(s.get("hours_slept", 0) for s in sleep_data) / len(sleep_data)

        result = await self.generate_weekly_insight(
            user_id=user_id,
            memories=memories,
            mood_data=mood_data,
            tasks=tasks,
        )

        if sleep_avg is not None:
            result["sleep_avg"] = round(sleep_avg, 1)

        return result

    @staticmethod
    def _extract_section(text: str, start_marker: str, end_marker: str | None) -> str:
        """Extract text between two markers in Claude's structured output.

        Args:
            text: Full response text from Claude.
            start_marker: String marking the beginning of the section.
            end_marker: String marking the end; ``None`` means take the rest.

        Returns:
            Extracted and stripped text, or the full text if markers not found.
        """
        try:
            start_idx = text.index(start_marker) + len(start_marker)
            if end_marker and end_marker in text:
                end_idx = text.index(end_marker, start_idx)
                return text[start_idx:end_idx].strip()
            return text[start_idx:].strip()
        except ValueError:
            return text.strip()

    @staticmethod
    def _extract_bullets(text: str, start_marker: str, end_marker: str | None) -> list[str]:
        """Extract bulleted list items between two markers.

        Args:
            text: Full response text.
            start_marker: Section start marker.
            end_marker: Section end marker or ``None``.

        Returns:
            List of stripped bullet strings (without leading ``- ``).
        """
        try:
            start_idx = text.index(start_marker) + len(start_marker)
            if end_marker and end_marker in text:
                end_idx = text.index(end_marker, start_idx)
                section = text[start_idx:end_idx]
            else:
                section = text[start_idx:]
            return [
                line.lstrip("- •*").strip()
                for line in section.splitlines()
                if line.strip().startswith(("-", "•", "*"))
            ]
        except ValueError:
            return []

    @staticmethod
    def _extract_field(text: str, field: str) -> str:
        """Extract a single-line field value from Claude's labelled output.

        Args:
            text: Full response text.
            field: Label including trailing colon (e.g. ``SEVERITY:``).

        Returns:
            Value string, or empty string if not found.
        """
        for line in text.splitlines():
            if line.upper().startswith(field.upper()):
                return line[len(field):].strip()
        return ""
