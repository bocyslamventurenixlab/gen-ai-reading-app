"""Main FastAPI application"""
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv

from .models import QueryRequest
from .agents import SecurityAgent, LibrarianAgent, AnalystAgent, EditorAgent
from .embeddings import get_embedding

load_dotenv()

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1"

# Initialize Clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = OpenAI(base_url=OPENROUTER_URL, api_key=OPENROUTER_API_KEY)

app = FastAPI(title="Gen-AI Reading App Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- API ENDPOINTS ---

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "backend"}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Handles PDF upload, text extraction, embedding, and storage."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDFs allowed.")
    
    try:
        # 1. Extract Text
        try:
            reader = PdfReader(file.file)
            full_text = "".join([page.extract_text() + "\n" for page in reader.pages])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF parsing failed: {str(e)}")

        # 2. Save Document Record
        try:
            doc_resp = supabase.table("documents").insert({"title": file.filename}).execute()
            doc_id = doc_resp.data[0]['id']
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

        # 3. Chunking (approx 1000 chars)
        chunks = [full_text[i:i+1000] for i in range(0, len(full_text), 1000)]
        
        # 4. Generate Embeddings and Save
        embedding_data = []
        for chunk in chunks:
            if len(chunk.strip()) < 10:
                continue
            
            try:
                vector = get_embedding(client, chunk)
                embedding_data.append({
                    "doc_id": doc_id,
                    "content": chunk,
                    "embedding": vector
                })
            except Exception as e:
                print(f"Warning: Failed to embed chunk: {str(e)}")
                continue
        
        # Batch insert into Supabase
        try:
            if embedding_data:
                supabase.table("embeddings").insert(embedding_data).execute()
        except Exception as e:
            print(f"Warning: Failed to insert embeddings: {str(e)}")

        return {"message": "Upload & Embedding successful", "document_id": doc_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error during upload: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process")
async def process_query(request: QueryRequest):
    """The Multi-Agent Orchestration Chain."""
    try:
        # Initialize agents
        security_agent = SecurityAgent(client)
        librarian_agent = LibrarianAgent(client, supabase)
        analyst_agent = AnalystAgent(client)
        editor_agent = EditorAgent(client)
        
        # Node 1: Security
        if not security_agent.verify_input(request.query):
            supabase.table("security_logs").insert({"query": request.query, "type": "injection"}).execute()
            return {
                "summary": "Request Blocked: Security Policy Violation.",
                "key_points": [],
                "is_safe": False,
                "trace": ["Security Check Failed"]
            }

        # Node 2: Librarian (Semantic Search)
        context = librarian_agent.retrieve(request.document_id, request.query)
        
        # Node 3: Analyst (Reasoning)
        analysis_draft = analyst_agent.reason(context, request.query)
        
        # Node 4: Editor (Verification)
        final_output = editor_agent.verify_with_loop(analysis_draft, context)
        
        return {
            "summary": final_output.get("summary", analysis_draft),
            "key_points": final_output.get("key_points", []),
            "confidence_score": final_output.get("confidence_score", 0.8),
            "is_safe": True, 
            "trace": ["Security Cleared", "Semantic Retrieval Complete", "Reasoning Verified", "Schema Validated"]
        }
        
    except Exception as e:
        print(f"Error during processing: {e}")
        import traceback
        traceback.print_exc()
        return {
            "summary": f"Error processing query: {str(e)}",
            "key_points": [],
            "confidence_score": 0,
            "is_safe": False,
            "trace": ["Error encountered"],
            "error": str(e)
        }


@app.get("/documents")
async def get_documents():
    """Get all documents."""
    response = supabase.table("documents").select("*").order("upload_date", desc=True).execute()
    return response.data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)