from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ChatMessageIn(BaseModel):
    message: str


class ChatMessageOut(BaseModel):
    id: str
    finding_id: str
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
