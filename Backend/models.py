# backend/models.py

from typing import Optional, Dict, Any
from pydantic import BaseModel


class SecurityEvent(BaseModel):
    type: str
    severity: int
    url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}


class ThreatDetection(BaseModel):
    threat_detected: bool
    threat_type: Optional[str] = None
    confidence: int = 0
    explanation: str = ""
    user_friendly_message: str = ""


class PetState(BaseModel):
    health: int
    evolution_stage: int
    points: int
    streak: int
    state: str
