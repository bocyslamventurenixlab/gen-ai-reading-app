# AI Reading App - Backend

FastAPI backend service for semantic search, document processing, and multi-agent reasoning.

## Setup

```bash
cd backend
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update with your actual values:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase API key
- `OPENROUTER_API_KEY`: Your OpenRouter API key

## Development

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server runs on `http://localhost:8000`

API docs available at `http://localhost:8000/docs`

## Production

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Architecture

### Multi-Agent System

The backend uses a chain-of-thought multi-agent architecture:

1. **SecurityAgent** - Validates input for injection attempts
2. **LibrarianAgent** - Semantic search using embeddings
3. **AnalystAgent** - Reasoning with retrieved context
4. **EditorAgent** - Format and validate responses

### Key Modules

- `app/main.py` - FastAPI application and endpoints
- `app/agents.py` - Multi-agent orchestration
- `app/embeddings.py` - Semantic search with vector similarity
- `app/models.py` - Pydantic models
- `database/migrations/` - SQL schema

## API Endpoints

- `GET /health` - Health check
- `POST /upload` - Upload and process PDF
- `POST /process` - Query a document
- `GET /documents` - List all documents

## Testing

```bash
# Upload a PDF
curl -X POST http://localhost:8000/upload \
  -F "file=@document.pdf"

# Query a document
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"document_id": 1, "query": "What is the main topic?"}'
```
