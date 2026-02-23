# Gateway Middleware

API Gateway for Gen-AI Reading App. Routes requests from the frontend to the backend Python service and handles Supabase authentication.

## Setup

```bash
cd gateway
npm install
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update with your actual values:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase API key
- `BACKEND_URL`: Python backend URL (default: http://localhost:8000)

## Development

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## Production

```bash
npm start
```

## Endpoints

- `GET /health` - Health check for gateway and backend
- `POST /documents/upload` - Upload PDF file
- `GET /documents` - List all documents
- `POST /query/process` - Process a query against a document

## Architecture

```
Frontend (React)
    ↓
Gateway (Node.js/Express)
    ├→ Authentication (Supabase JWT)
    ├→ Logging
    └→ Error Handling
    ↓
Backend (Python/FastAPI)
    └→ Supabase (DB & Auth)
```
