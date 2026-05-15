from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random

app = FastAPI(title="AI & OCR Microservice")

# Allow CORS for NextJS frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Document(BaseModel):
    image_base64: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze-document")
def analyze_document(doc: Document):
    # Simulated OCR extraction
    confidence = round(random.uniform(92.0, 99.9), 2)
    risk_score = random.randint(1, 4) # Lower risk for better mock
    
    return {
        "confidence": confidence,
        "extracted_text": "LAND_DOC_2024_001",
        "fields": {
            "owner": "G. Vineeth",
            "survey_number": "1910/2026",
            "area": "2.5 Acres",
            "location": "Warangal, Telangana"
        },
        "risk_score": risk_score,
        "status": "VERIFIED_BY_AI"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
