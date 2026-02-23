#!/bin/bash

echo "🔍 Testing Project Setup"
echo "========================"
echo

# Test 1: Docker Compose
echo "✓ Test 1: Docker Compose Configuration"
docker-compose config > /dev/null 2>&1 && echo "  ✓ docker-compose.yml is valid" || echo "  ✗ Invalid"

# Test 2: Backend Python
echo "✓ Test 2: Backend Python Syntax"
cd backend
python -m py_compile app/*.py 2>/dev/null && echo "  ✓ All Python files valid" || echo "  ✗ Syntax errors"
cd ..

# Test 3: Gateway Node Modules
echo "✓ Test 3: Gateway Dependencies"
cd gateway
if [ -d "node_modules" ]; then
  echo "  ✓ Dependencies installed"
  npm list --depth=0 2>/dev/null | head -15
else
  echo "  ✗ Run: npm install"
fi
cd ..

# Test 4: Environment Files
echo "✓ Test 4: Environment Files"
[ -f ".env" ] && echo "  ✓ Root .env exists" || echo "  ✗ Missing .env"
[ -f "backend/.env.example" ] && echo "  ✓ backend/.env.example exists" || echo "  ✗ Missing"
[ -f "gateway/.env.example" ] && echo "  ✓ gateway/.env.example exists" || echo "  ✗ Missing"
[ -f "frontend/.env.example" ] && echo "  ✓ frontend/.env.example exists" || echo "  ✗ Missing"

# Test 5: Key Files
echo "✓ Test 5: Key Files"
[ -f "database/migrations/001_initial.sql" ] && echo "  ✓ Database migrations" || echo "  ✗ Missing"
[ -f "docker-compose.yml" ] && echo "  ✓ Docker Compose" || echo "  ✗ Missing"
[ -f "backend/Dockerfile" ] && echo "  ✓ Backend Dockerfile" || echo "  ✗ Missing"
[ -f "gateway/Dockerfile" ] && echo "  ✓ Gateway Dockerfile" || echo "  ✗ Missing"
[ -f "frontend/Dockerfile" ] && echo "  ✓ Frontend Dockerfile" || echo "  ✗ Missing"

echo
echo "========================"
echo "📋 Next Steps:"
echo "========================"
echo "1. Update .env with your credentials:"
echo "   - SUPABASE_URL and SUPABASE_KEY"
echo "   - OPENROUTER_API_KEY"
echo ""
echo "2. Set up Supabase database:"
echo "   - Run: cat database/migrations/001_initial.sql"
echo "   - Execute in Supabase SQL editor"
echo ""
echo "3. Start the application:"
echo "   docker-compose up --build"
echo ""
echo "4. Access the app:"
echo "   - Frontend:  http://localhost:3000"
echo "   - Gateway:   http://localhost:3001"
echo "   - Backend:   http://localhost:8000"
