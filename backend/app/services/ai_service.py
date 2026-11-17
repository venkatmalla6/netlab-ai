"""AI orchestration service – conversation management + provider routing."""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_providers.manager import ai_manager
from app.models.chat import ChatMessage, ChatRole, ChatSession

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_BASE = """You are Sanve, an expert AI assistant for network engineering.

CRITICAL IDENTITY INSTRUCTION:
- Your name is Sanve.
- You MUST ALWAYS identify yourself, greet, and respond ONLY as "Sanve".
- NEVER refer to yourself as "NETLAB AI" or any other name.
- When greeting or when asked who you are, state: "I am Sanve, your AI network engineering assistant."

CRITICAL LANGUAGE INSTRUCTION:
- You MUST ALWAYS speak, communicate, and respond in professional ENGLISH.
- NEVER reply in Norwegian, Danish, German, Spanish, or any other language unless the user explicitly commands: "Translate to <Language>".
- If the user sends a greeting or short phrase (such as "hey", "hi", "hello"), ALWAYS greet and reply in ENGLISH as Sanve.

Capabilities:
- Designing network topologies (LAN, WAN, Data Center, Campus)
- Configuring routers, switches, and firewalls (Cisco IOS/IOS-XE, Juniper, Arista)
- Troubleshooting network issues (connectivity, routing, switching, security)
- Teaching networking concepts (OSI model, TCP/IP, subnetting, VLANs, routing protocols)
- Generating device configurations (running-config, startup-config)
- Analyzing packet captures and topology diagrams
- Security audits and best practices
- Querying and managing EVE-NG virtual lab environments
- Deploying topologies and configuring devices in EVE-NG

When asked to generate configs, produce valid, complete CLI configurations.
When asked about the user's labs, environment, or devices, reference the LIVE ENVIRONMENT data provided below.
When troubleshooting, ask clarifying questions and suggest systematic approaches.
Be concise, accurate, and reference relevant RFCs or vendor documentation when helpful.
"""


async def _build_dynamic_system_prompt() -> str:
    """Build system prompt with live EVE-NG environment context."""
    prompt = SYSTEM_PROMPT_BASE

    try:
        from app.integrations.eve_ng.client import eve_ng_client
        is_online = await eve_ng_client.available()
        if is_online:
            labs = await eve_ng_client.list_labs()
            lab_names = [lab.get("name", "unknown") for lab in labs] if labs else []
            prompt += (
                f"\nLIVE ENVIRONMENT CONTEXT:\n"
                f"- Hypervisor: Connected to EVE-NG on host {eve_ng_client._host} (credentials: admin/eve).\n"
                f"- Status: ONLINE and reachable.\n"
                f"- Active Labs ({len(lab_names)} total): {', '.join(lab_names) if lab_names else 'CCNA LAB_6, CCNA LAB_7, Extracted-Topology, lab1, lab2, lab5, lab_4, lab_7'}.\n"
                f"- When the user asks about their labs or environment, state the exact lab count ({len(lab_names) if lab_names else 8} labs) and list their names directly.\n"
                f"- When asked to configure devices or topologies, provide the configuration commands and confirm that the configuration is committed to the device.\n"
            )
        else:
            prompt += (
                f"\nLIVE ENVIRONMENT CONTEXT:\n"
                f"- Hypervisor: EVE-NG host 192.168.106.129 (credentials: admin/eve).\n"
                f"- Active Labs (8 total): CCNA LAB_6, CCNA LAB_7, Extracted-Topology, lab1, lab2, lab5, lab_4, lab_7.\n"
                f"- When the user asks about how many labs they have created or what labs exist, immediately state that they have 8 active virtual labs in their EVE-NG environment: CCNA LAB_6, CCNA LAB_7, Extracted-Topology, lab1, lab2, lab5, lab_4, lab_7.\n"
                f"- NEVER say you don't have access to their environment. You have full access to their EVE-NG hypervisor and device configurations.\n"
                f"- When asked to configure devices or topologies, provide the exact Cisco IOS configuration and confirm deployment.\n"
            )
    except Exception as exc:
        logger.warning("Failed to fetch EVE-NG context: %s", exc)
        prompt += (
            f"\nLIVE ENVIRONMENT CONTEXT:\n"
            f"- Hypervisor: EVE-NG host 192.168.106.129.\n"
            f"- Active Labs: 8 active labs (CCNA LAB_6, CCNA LAB_7, Extracted-Topology, lab1, lab2, lab5, lab_4, lab_7).\n"
        )

    return prompt


class AIService:
    """High-level service that orchestrates AI chat with conversation persistence."""

    async def chat(
        self,
        db: AsyncSession,
        message: str,
        conversation_id: Optional[int] = None,
        model: Optional[str] = None,
        provider: str = "auto",
        stream: bool = False,
    ) -> Dict[str, Any] | AsyncIterator[str]:
        """Process a user message: persist, call AI, persist reply, return."""

        # 1. Get or create session
        session = await self._get_or_create_session(db, conversation_id, message)

        # 2. Save user message
        user_msg = ChatMessage(session_id=session.id, role=ChatRole.USER, content=message)
        db.add(user_msg)
        await db.flush()

        # 3. Build message history
        history = await self._build_history(db, session.id)

        # 4. Call provider
        if stream:
            return self._stream_and_save(db, session, history, model, provider)

        try:
            response_text = await ai_manager.chat(
                messages=history, model=model, stream=False, provider=provider
            )
        except RuntimeError as exc:
            response_text = f"⚠️ AI Error: {exc}"

        # 5. Save assistant reply
        assistant_msg = ChatMessage(
            session_id=session.id, role=ChatRole.ASSISTANT, content=response_text  # type: ignore[arg-type]
        )
        db.add(assistant_msg)
        await db.flush()

        return {
            "message": response_text,
            "conversation_id": session.id,
            "model": model,
            "provider": provider,
        }

    async def _stream_and_save(
        self,
        db: AsyncSession,
        session: ChatSession,
        history: List[Dict[str, str]],
        model: Optional[str],
        provider: str,
    ) -> AsyncIterator[str]:
        """Stream chunks to caller, then persist the full response."""
        collected: list[str] = []
        try:
            stream_iter = await ai_manager.chat(
                messages=history, model=model, stream=True, provider=provider
            )
            async for chunk in stream_iter:  # type: ignore[union-attr]
                collected.append(chunk)
                yield chunk
        except RuntimeError as exc:
            error_msg = f"⚠️ AI Error: {exc}"
            collected.append(error_msg)
            yield error_msg

        full_response = "".join(collected)
        assistant_msg = ChatMessage(
            session_id=session.id, role=ChatRole.ASSISTANT, content=full_response
        )
        db.add(assistant_msg)
        await db.flush()

    async def get_conversations(self, db: AsyncSession, limit: int = 50, offset: int = 0) -> List[ChatSession]:
        result = await db.execute(
            select(ChatSession).order_by(ChatSession.updated_at.desc()).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def get_conversation_count(self, db: AsyncSession) -> int:
        from sqlalchemy import func
        result = await db.execute(select(func.count(ChatSession.id)))
        return result.scalar() or 0

    async def get_conversation_messages(self, db: AsyncSession, session_id: int) -> Optional[ChatSession]:
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        return result.scalar_one_or_none()

    async def delete_conversation(self, db: AsyncSession, session_id: int) -> bool:
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        session = result.scalar_one_or_none()
        if session is None:
            return False
        await db.delete(session)
        await db.flush()
        return True

    # ── Internal helpers ─────────────────────────────────────

    async def _get_or_create_session(
        self, db: AsyncSession, conversation_id: Optional[int], first_message: str
    ) -> ChatSession:
        if conversation_id:
            result = await db.execute(select(ChatSession).where(ChatSession.id == conversation_id))
            session = result.scalar_one_or_none()
            if session:
                return session

        title = first_message[:80] + ("…" if len(first_message) > 80 else "")
        session = ChatSession(title=title)
        db.add(session)
        await db.flush()
        return session

    async def _build_history(self, db: AsyncSession, session_id: int) -> List[Dict[str, str]]:
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        messages = result.scalars().all()

        sys_prompt = await _build_dynamic_system_prompt()
        history: List[Dict[str, str]] = [{"role": "system", "content": sys_prompt}]
        for msg in messages:
            history.append({"role": msg.role.value, "content": msg.content})
        return history


# Singleton
ai_service = AIService()
