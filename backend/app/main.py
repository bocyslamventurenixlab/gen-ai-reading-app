"""Main FastAPI application"""
import os
import re
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv

from .models import QueryRequest, ScrapeRequest
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
async def upload_pdf(request: Request, file: UploadFile = File(...)):
    """Handles PDF upload, text extraction, embedding, and storage."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDFs allowed.")
    
    # Get user_id from request header (passed by gateway)
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID is required (X-User-ID header missing)")
    
    try:
        # 0. Ensure user exists in users table (create if not present)
        try:
            supabase.table("users").insert({
                "id": user_id,
                "email": f"user-{user_id[:8]}@app.local"  # Placeholder email
            }).execute()
        except Exception as e:
            # User might already exist, continue
            print(f"User creation/check: {str(e)}")
        
        # 1. Extract Text
        try:
            reader = PdfReader(file.file)
            full_text = "".join([page.extract_text() + "\n" for page in reader.pages])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF parsing failed: {str(e)}")

        # 2. Save Document Record with user_id (required by RLS policy)
        try:
            doc_resp = supabase.table("documents").insert({
                "title": file.filename,
                "user_id": user_id
            }).execute()
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


@app.post("/process")
async def process_query(request_obj: Request, request: QueryRequest):
    """The Multi-Agent Orchestration Chain."""
    try:
        # Get user_id from request header (passed by gateway)
        user_id = request_obj.headers.get("X-User-ID")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID is required (X-User-ID header missing)")
        
        # Ensure user exists in users table (create if not present)
        try:
            supabase.table("users").insert({
                "id": user_id,
                "email": f"user-{user_id[:8]}@app.local"  # Placeholder email
            }).execute()
        except Exception as e:
            # User might already exist, continue
            print(f"User creation/check in /process: {str(e)}")
        
        # Initialize agents
        security_agent = SecurityAgent(client)
        librarian_agent = LibrarianAgent(client, supabase)
        analyst_agent = AnalystAgent(client)
        editor_agent = EditorAgent(client)
        
        # Node 1: Security
        if not security_agent.verify_input(request.query):
            supabase.table("security_logs").insert({
                "query": request.query,
                "type": "injection",
                "user_id": user_id
            }).execute()
            return {
                "summary": "Request Blocked: Security Policy Violation.",
                "key_points": [],
                "is_safe": False,
                "trace": ["Security Check Failed"]
            }

        # Node 2: Librarian (Semantic Search)
        context = librarian_agent.retrieve(request.document_id, request.query, user_id)
        
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


@app.post("/scrape")
async def scrape_url(request_obj: Request, body: ScrapeRequest):
    """Scrape a URL using Playwright, extract text, generate PDF, embed and store as a document."""
    user_id = request_obj.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID is required (X-User-ID header missing)")

    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL. Must start with http:// or https://")

    try:
        # Ensure user exists
        try:
            supabase.table("users").insert({
                "id": user_id,
                "email": f"user-{user_id[:8]}@app.local"
            }).execute()
        except Exception:
            pass

        # Use Playwright to scrape
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            page = await browser.new_page()

            # Try domcontentloaded first (fast), fall back to just load
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                # Give JS a moment to render dynamic content
                await page.wait_for_timeout(2000)
            except Exception:
                # Last resort: just wait for load event
                await page.goto(url, wait_until="load", timeout=45000)

            page_title = await page.title() or url

            # Extract readable text (remove scripts, styles, nav, footer)
            full_text = await page.evaluate("""
                () => {
                    const remove = document.querySelectorAll('script, style, nav, footer, header, noscript');
                    remove.forEach(el => el.remove());
                    return document.body ? document.body.innerText : '';
                }
            """)

            # Generate PDF to a temp file
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                pdf_path = tmp.name
            await page.pdf(path=pdf_path, format="A4", print_background=True)

            await browser.close()

        # Save document record
        safe_title = f"[Web] {page_title[:80]}"
        doc_resp = supabase.table("documents").insert({
            "title": safe_title,
            "user_id": user_id
        }).execute()
        doc_id = doc_resp.data[0]["id"]

        # Chunk and embed text
        chunks = [full_text[i:i+1000] for i in range(0, len(full_text), 1000)]
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

        if embedding_data:
            supabase.table("embeddings").insert(embedding_data).execute()

        # Clean up temp PDF
        os.unlink(pdf_path)

        return {
            "message": "URL scraped and embedded successfully",
            "document_id": doc_id,
            "title": safe_title,
            "chunks_embedded": len(embedding_data)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error scraping URL: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Scrape failed: {str(e)}")


@app.get("/documents")
async def get_documents(request: Request):
    """Get all documents for the authenticated user."""
    # Get user_id from request header (passed by gateway)
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID is required (X-User-ID header missing)")
    
    try:
        # Filter documents by user (enforce RLS at application level)
        response = supabase.table("documents").select("*").eq("user_id", user_id).order("upload_date", desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)