# 🚀 Quick Start (5 Minutes)

## Prerequisites
- Docker Desktop installed
- Supabase account created
- OpenRouter API key (free tier)

## 1️⃣ Get Credentials (2 min)

### Supabase
1. Create account: https://supabase.com
2. New project
3. Copy from Settings → API:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (anon key)

### OpenRouter  
1. Create account: https://openrouter.ai
2. Get API key from Settings
3. Add $5 credit from invite link

## 2️⃣ Configure Environment (1 min)

```bash
# Edit .env in root directory
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
OPENROUTER_API_KEY=your-key
```

## 3️⃣ Create Database Tables (1 min)

1. Open Supabase → SQL Editor
2. Copy from `database/migrations/001_initial.sql`
3. Paste and Run

## 4️⃣ Start Application (1 min)

```bash
docker-compose up --build
```

Wait for "Health checks passed" message (~2 min for first run)

## 5️⃣ Use the App

- Frontend: http://localhost:3000
- Gateway: http://localhost:3001  
- Backend Docs: http://localhost:8000/docs

### Upload PDF
1. Click "Upload PDF"
2. Select file
3. Wait for embedding ⏳

### Ask Questions
1. Select document
2. Type question
3. See AI response + agent trace

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Can't connect to Supabase | Check URL/KEY in .env |
| PDF upload fails | Check file is valid PDF |
| Frontend can't reach gateway | Restart: `docker-compose restart` |
| Slow response | OpenRouter might be throttling |

## 📚 Full Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete setup instructions
- [README.md](README.md) - Architecture & features
- [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) - What changed

## 🎯 Deploy to Railway

1. Push to GitHub: `git push`
2. Go to railway.app → New Project
3. Select GitHub repo
4. Set environment variables
5. Done! 🎉

---
**Questions?** Check the detailed guides above.
