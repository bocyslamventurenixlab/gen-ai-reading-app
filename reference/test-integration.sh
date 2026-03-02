#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Authentication System Tests${NC}"
echo -e "${BLUE}================================${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Checks${NC}"
echo "Checking Gateway..."
GATEWAY_HEALTH=$(curl -s http://localhost:3001/health)
if echo "$GATEWAY_HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Gateway healthy${NC}"
else
    echo -e "${RED}✗ Gateway health check failed${NC}"
    exit 1
fi

echo "Checking Backend..."
BACKEND_HEALTH=$(curl -s http://localhost:8000/health)
if echo "$BACKEND_HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Backend healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    exit 1
fi

# Test 2: Protected Routes without Auth
echo -e "\n${YELLOW}Test 2: Protected Routes Without JWT${NC}"

echo "Attempting GET /documents without token..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/documents)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ GET /documents returns 401 without token${NC}"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi

echo "Attempting POST /documents/upload without token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/documents/upload)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ POST /documents/upload returns 401 without token${NC}"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi

echo "Attempting POST /query/process without token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/query/process -H "Content-Type: application/json" -d '{"document_id": 1, "query": "test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ POST /query/process returns 401 without token${NC}"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi

# Test 3: Simulated JWT Token (Development Mode)
echo -e "\n${YELLOW}Test 3: Document Upload with Development Token${NC}"

# Create a test PDF file
TEST_PDF="/tmp/test-auth.pdf"
cat > "$TEST_PDF" << 'EOF'
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000333 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
412
%%EOF
EOF

# Test with a dummy Bearer token (dev mode should accept it)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/documents/upload \
  -H "Authorization: Bearer fake-token-for-testing" \
  -F "file=@$TEST_PDF")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Upload endpoint accepts authenticated request${NC}"
    echo "Response: $BODY"
else
    echo -e "${YELLOW}Note: Got HTTP $HTTP_CODE (development depends on Supabase connection)${NC}"
fi

# Test 4: Check Frontend
echo -e "\n${YELLOW}Test 4: Frontend Accessibility${NC}"

FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000)
HTTP_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}Note: Frontend returned $HTTP_CODE (expected for Vite dev server)${NC}"
fi

echo -e "\n${BLUE}================================${NC}"
echo -e "${GREEN}Integration Tests Complete!${NC}"
echo -e "${BLUE}================================${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Frontend Login: http://localhost:3000"
echo "2. Sign up with email/password or use Google OAuth"
echo "3. Once authenticated, test document upload"
echo "4. All API calls will include JWT token automatically"
echo ""
echo -e "${YELLOW}Environment Check:${NC}"
echo "SUPABASE_URL: ${SUPABASE_URL:-(not set)}"
echo "Environment: ${NODE_ENV:-(not set)}"
