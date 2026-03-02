# Setup Guide for Codespace & Railway Deployment

This guide walks you through setting up the Gen-AI Reading App in Codespace and preparing it for Railway deployment.

## Step 1: Verify Project Structure

The project has been reorganized into a microservices architecture:

```
gen-ai-reading-app/
├── frontend/          # React + Vite (Port 3000)
├── gateway/           # Node.js Express Gateway (Port 3001)
├── backend/           # Python FastAPI (Port 8000)
├── database/          # SQL migrations
└── docker-compose.yml # Orchestration file
```

## Step 2: Configure Environment Variables

### 2.1 Supabase Setup

1. Go to [supabase.com](https://supabase.com)
2. Create a new project (free tier)
3. Wait for provisioning (~2 minutes)
4. Copy your credentials from **Settings → API**:
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_KEY`: `anon` public key

### 2.2 OpenRouter Setup

1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up and get an API key
3. Fund your account (free credits available)

### 2.3 Create Environment Files

```bash
# Root directory
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Gateway  
cp gateway/.env.example gateway/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 2.4 Edit `.env` with Your Credentials

```bash
# .env (in root)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
OPENROUTER_API_KEY=your-openrouter-key
VITE_GATEWAY_URL=http://localhost:3001
NODE_ENV=development
BACKEND_URL=http://backend:8000
```

## Step 3: Create Supabase Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy-paste the entire contents of `database/migrations/001_initial.sql`
4. Click **Run**

The migration will:
- ✅ Create all required tables (users, documents, embeddings, security_logs)
- ✅ Enable Row Level Security (RLS)
- ✅ Create RLS policies for user isolation
- ✅ Create vector similarity search function
- ✅ Create performance indexes

**Note:** The schema includes UUID support for Supabase Auth and full RLS enforcement.

## Step 4: Test in Codespace

### 4.1 Install Dependencies

```bash
# Gateway
cd gateway
npm install
cd ..
```

Backend dependencies are installed in Docker.

### 4.2 Run with Docker Compose

```bash
# Start all services
docker-compose up --build

# First startup takes ~5 minutes
```

### 4.3 Verify Services

- **Frontend**: http://localhost:3000
- **Gateway**: http://localhost:3001/health
- **Backend**: http://localhost:8000/docs

### 4.4 Test Upload Flow

1. Open http://localhost:3000
2. Click "Upload PDF"
3. Select sample PDF (or any PDF)
4. Wait for embedding to complete
5. Select document from list
6. Ask a question
7. Review agent trace

## Step 5: Prepare for Railway Deployment

### 5.1 Push to GitHub

```bash
git add .
git commit -m "Complete multi-service refactor with gateway and Docker"
git push
```

### 5.2 Create Railway Account

Go to [railway.app](https://railway.app) and sign up

### 5.3 Deploy on Railway

#### Option A: GitHub Integration (Recommended)

1. Go to Railway dashboard
2. Click "New Project"
3. Select "GitHub Repo"
4. Authorize and select this repository
5. Railway auto-configures services based on Dockerfiles

#### Option B: Manual Services

1. Create new project
2. Add services:
   - **Frontend**: `docker-compose up frontend`
   - **Gateway**: `docker-compose up gateway`  
   - **Backend**: `docker-compose up backend`

### 5.4 Configure Environment Variables on Railway

For each service, add environment variables:

**All Services:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
OPENROUTER_API_KEY=your-openrouter-key
```

**Gateway Service:**
```
BACKEND_URL=http://backend:8000
NODE_ENV=production
```

**Frontend Service:**
```
VITE_GATEWAY_URL=https://your-gateway-domain.railway.app
```

### 5.5 Connect Services

In Railway:

1. Go to Backend service → Variables
2. Find `PORT` = 8000

3. Go to Gateway service → Variables
4. Add `BACKEND_URL` = `http://backend-service-internal-url:8000`

5. Go to Frontend service → Variables
6. Add `VITE_GATEWAY_URL` = `https://gateway-domain.railway.app`

### 5.6 Configure Domains

1. Backend: No public domain needed
2. Gateway: Generate public domain
3. Frontend: Generate public domain

## Service Architecture on Railway

```
┌──────────────────────────────┐
│  Frontend (Node.js 18)       │
│  - Build: npm run build      │
│  - Start: serve -s dist      │
│  - Port: 3000                │
│  - Domain: auto-generated    │
└────────┬─────────────────────┘
         │ HTTP
         ▼
┌──────────────────────────────┐
│  Gateway (Node.js 18)        │
│  - Build: npm install        │
│  - Start: node src/index.js  │
│  - Port: 3001                │
│  - Domain: auto-generated    │
└────────┬─────────────────────┘
         │ HTTP
         ▼
┌──────────────────────────────┐
│  Backend (Python 3.11)       │
│  - Build: pip install -r req │
│  - Start: uvicorn app.main.. │
│  - Port: 8000                │
│  - Internal only             │
└────────┬─────────────────────┘
         │ API
         ▼
    Supabase (External)
```

## Troubleshooting

### Docker Issues

```bash
# Clean up everything
docker-compose down -v

# Rebuild
docker-compose up --build
```

### Backend can't reach Supabase

1. Check env variables: `docker exec gen-ai-backend env | grep SUPABASE`
2. First table creation (embeddings) can take ~30 seconds
3. Check Supabase status: [status.supabase.com](https://status.supabase.com)

### Gateway can't reach Backend

```bash
# Test from gateway container
docker-compose exec gateway curl http://backend:8000/health
```

### Frontend can't reach Gateway

1. Check browser console for CORS errors
2. Ensure `VITE_GATEWAY_URL` is correct
3. Gateway must be running and healthy

### Upload fails

- PDF must be valid and under 10MB
- Check backend logs: `docker-compose logs backend`
- Embeddings may take 30+ seconds per document

## Performance Tips

### For Codespace Testing

- Backend limited to 1 inference at a time (LLM API rate limit)
- Frontend rebuild takes ~30 seconds
- First Docker build takes ~5 minutes

### For Railway

- Keep free tier initially (good for testing)
- Upgrade if hitting rate limits
- Monitor costs: each service runs 24/7 unless configured otherwise

## Local Development Without Docker

```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Terminal 2: Gateway
cd gateway
npm install
npm run dev

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

Then update `.env`:
```
VITE_GATEWAY_URL=http://localhost:3001
BACKEND_URL=http://localhost:8000
```

## Next Steps

1. ✅ Project structure reorganized
2. ✅ Docker configuration complete
3. ✅ Multi-service architecture implemented
4. ⬜ Deploy to Railway (your next step)
5. ⬜ Configure custom domain
6. ⬜ Set up CI/CD pipeline

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Express Docs**: https://expressjs.com
- **Railway Docs**: https://docs.railway.app
- **Docker Docs**: https://docs.docker.com

## Files Changed

- ✅ Reorganized project into microservices
- ✅ Created Node.js gateway with auth
- ✅ Refactored Python backend into modules
- ✅ Added Dockerfiles for all services
- ✅ Updated frontend to use gateway
- ✅ Created docker-compose orchestration

Total: 40+ files created/modified
