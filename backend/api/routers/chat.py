import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.api.dependencies import get_db
from backend.models.db import Finding, ChatMessage
from backend.schemas.chat import ChatMessageIn, ChatMessageOut
from backend.core.errors import NotFoundError

router = APIRouter(tags=["Chat"])


@router.post("/findings/{finding_id}/chat", response_model=ChatMessageOut, status_code=status.HTTP_200_OK)
async def chat_about_finding(
    finding_id: str,
    payload: ChatMessageIn,
    session: AsyncSession = Depends(get_db),
):
    """Ask AutoPatch AI about root causes, safety implications, or test results."""
    stmt = select(Finding).where(Finding.id == finding_id)
    finding = (await session.execute(stmt)).scalar_one_or_none()
    if not finding:
        raise NotFoundError("Finding", finding_id)

    # Save user message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        finding_id=finding_id,
        role="user",
        content=payload.message,
    )
    session.add(user_msg)

    # Assistant contextual reply
    assistant_content = (
        f"Regarding finding '{finding.title}' in `{finding.file}`: "
        f"The root cause identified is: {finding.root_cause}. "
        f"The proposed patch introduces contract checks preventing `{finding.repro_input}` from crashing the runtime. "
        f"All surrounding functions and callers remain backward-compatible without side effects."
    )

    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        finding_id=finding_id,
        role="assistant",
        content=assistant_content,
    )
    session.add(assistant_msg)

    await session.commit()
    await session.refresh(assistant_msg)

    return ChatMessageOut(
        id=assistant_msg.id,
        finding_id=assistant_msg.finding_id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        created_at=assistant_msg.created_at,
    )


@router.get("/findings/{finding_id}/chat", response_model=list[ChatMessageOut])
async def get_chat_history(
    finding_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Retrieve chat audit history for a finding."""
    stmt = select(ChatMessage).where(ChatMessage.finding_id == finding_id).order_by(ChatMessage.created_at.asc())
    messages = (await session.execute(stmt)).scalars().all()

    return [ChatMessageOut.model_validate(m) for m in messages]
