from motor.motor_asyncio import AsyncIOMotorClient
import os
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone

# -------------------------------
# 🔗 MongoDB Config
# -------------------------------

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "vigil_ai"

client: AsyncIOMotorClient = None


# -------------------------------
# 🚀 Connection Functions
# -------------------------------

async def connect_to_mongo():
    global client
    client = AsyncIOMotorClient(MONGO_URL)
    print("✅ Connected to MongoDB")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("❌ MongoDB connection closed")


def get_database():
    return client[DB_NAME]


# -------------------------------
# 📦 Collections
# -------------------------------

ANALYSIS_COLLECTION = "compliance_analysis"
USERS_COLLECTION = "users"

# 🔥 For your Vigil AI system
SCANS_COLLECTION = "scans"
REPORTS_COLLECTION = "reports"
REMEDIATION_COLLECTION = "remediations"


# -------------------------------
# 📊 Schema (DO NOT REMOVE)
# -------------------------------

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