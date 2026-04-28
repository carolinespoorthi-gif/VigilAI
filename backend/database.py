from motor.motor_asyncio import AsyncIOMotorClient
import os
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone

# MongoDB connection URL
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

# Database and collection names
DB_NAME = "vigil_ai"
ANALYSIS_COLLECTION = "compliance_analysis"
USERS_COLLECTION = "users"

client: AsyncIOMotorClient = None

async def connect_to_mongo():
    global client
    client = AsyncIOMotorClient(MONGO_URL)
    print("Connected to MongoDB.")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection.")

def get_database():
    return client[DB_NAME]

# Pydantic schema for the output of the LLM analysis and DB document
class ComplianceAnalysisResult(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    document_name: str
    dataset_type: str
    upload_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    compliance_status: str
    risk_level: str
    compliance_score: float
    pii_detected: Dict[str, int]
    violated_regulations: List[str]
    risk_items: int
    remediation_actions: List[str]

    model_config = {
        "populate_by_name": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat() + "Z"
        }
    }
