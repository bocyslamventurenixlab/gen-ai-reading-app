# Authentication System Guide

## Overview

The application uses a **three-tier microservices architecture** with JWT-based authentication:

```
Frontend (React/Vite) → Gateway (Node.js) → Backend (Python/FastAPI)
         ↓
    Supabase Auth (JWT Generation)
```

## Architecture Flow

### 1. **Frontend Layer** (Port 3000)
- React/Vite application with responsive UI
- Uses **Supabase Auth client** (`@supabase/supabase-js`) directly
- Handles user registration, login, and Google OAuth
- Manages auth state via **AuthContext** (React Context API)
- Automatically includes JWT token in all API requests via `Authorization: Bearer` header

### 2. **Gateway Layer** (Port 3001)
- Node.js/Express server acts as API proxy
- Implements **`verifyAuth` middleware** on protected routes
- Validates JWT tokens from Supabase
- Extracts user information and passes it to backend
- Handles multipart form-data for file uploads
- Routes:
  - `GET /documents` - List user's documents (protected)
  - `POST /documents/upload` - Upload PDF (protected)
  - `POST /query/process` - Process document queries (protected)
  - `GET /health` - Health check (public)

### 3. **Backend Layer** (Port 8000)
- Python/FastAPI application for document processing
- Receives user context from gateway (`X-User-ID` header)
- Implements **Row-Level Security (RLS)** on database queries
- Processes PDFs, including encrypted PDFs
- Routes:
  - `POST /documents/upload` - Store PDF metadata
  - `GET /documents/get` - Retrieve documents (filtered by user)
  - `POST /query/process` - Process AI queries on documents
  - `GET /health` - Health check

### 4. **Database** (Supabase PostgreSQL)
- Stores document metadata (id, filename, user_id, upload_date)
- Implements RLS policies to ensure users can only access their own data
- Secure token-based authentication via Supabase

## Authentication Flow

### User Registration
```
1. User visits http://localhost:3000
2. Clicks "Sign Up" on Login page
3. Enters email and password
4. Frontend calls Supabase Auth API
5. Supabase creates user and returns JWT token
6. Token stored in browser session
7. User redirected to main app
```

### User Login
```
1. User enters email and password
2. Frontend calls Supabase Auth API
3. Supabase validates credentials and returns JWT
4. Token stored in browser session
5. User logged in successfully
```

### Google OAuth Login
```
1. User clicks "Sign in with Google"
2. Frontend redirects to Supabase OAuth flow
3. User authenticates with Google
4. Supabase creates/updates user record
5. JWT token returned and stored
6. User logged in and redirected to app
```

### Protected API Call (e.g., Document Upload)
```
1. User selects PDF file
2. Frontend retrieves JWT token:
   const { data: { session } } = await supabase.auth.getSession()
3. Frontend adds to request headers:
   headers: {
     'Authorization': `Bearer ${session.access_token}`
   }
4. Frontend POSTs to http://localhost:3001/documents/upload
5. Gateway receives request with token
6. Gateway's `verifyAuth` middleware:
   - Extracts token from Authorization header
   - Validates token with Supabase
   - Attaches user data to request object
7. Gateway forwards to Backend with user context
8. Backend creates document record with user_id
9. Database RLS ensures document associated with user
```

## Environment Variables

### Frontend (`.env.local` or `docker-compose` env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GATEWAY_URL=http://localhost:3001  # Optional, defaults to localhost
```

### Gateway (`.env`)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
NODE_ENV=production
```

### Backend (`.env`)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=your-database-connection-string
```

## Protected Routes

### Documents Endpoints
All require valid JWT token in `Authorization: Bearer <token>` header

#### GET /documents
Returns list of user's documents
```bash
curl -s http://localhost:3001/documents \
  -H "Authorization: Bearer <jwt-token>"
```

#### POST /documents/upload
Upload a new PDF file
```bash
curl -X POST http://localhost:3001/documents/upload \
  -H "Authorization: Bearer <jwt-token>" \
  -F "file=@document.pdf"
```

#### GET /documents/get
Get specific document metadata
```bash
curl -s http://localhost:3001/documents/get?id=1 \
  -H "Authorization: Bearer <jwt-token>"
```

### Query Endpoints
All require valid JWT token

#### POST /query/process
Process a query on a document
```bash
curl -X POST http://localhost:3001/query/process \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": 1,
    "query": "What is the main topic?"
  }'
```

## Authentication Middleware

### Location
`/gateway/src/middleware/auth.js`

### Key Function: `verifyAuth`
```javascript
export const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Attach user to request for downstream usage
    req.user = data.user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
```

## Frontend Integration

### AuthContext Setup
Location: `/frontend/src/context/AuthContext.jsx`

Provides:
- `user` - Current authenticated user object
- `signUpWithEmail()` - Register with email/password
- `signInWithEmail()` - Login with email/password
- `signInWithGoogle()` - OAuth with Google
- `signOut()` - Logout user
- `loading` - Auth state loading indicator

### Usage in Components
```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, signOut } = useAuth();
  
  if (!user) {
    return <Login />;
  }
  
  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### Making Authenticated API Calls
```javascript
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {};
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
};

// Usage
const headers = await getAuthHeaders();
const response = await fetch('http://localhost:3001/documents', { headers });
```

## Testing

### Integration Test Script
Location: `/workspaces/gen-ai-reading-app/test-integration.sh`

Run tests:
```bash
./test-integration.sh
```

Tests verify:
- ✓ All services healthy (frontend, gateway, backend)
- ✓ Protected routes return 401 without JWT
- ✓ Gateway properly validates and forwards auth
- ✓ Frontend accessible at http://localhost:3000

### Manual Testing

1. **Start Services**
   ```bash
   docker-compose up -d
   ```

2. **Test Frontend**
   - Navigate to http://localhost:3000
   - Click "Sign Up"
   - Enter email and password
   - Verify login successful

3. **Test Google OAuth**
   - Click "Sign in with Google"
   - Complete Google authentication
   - Verify logged in

4. **Test Document Upload**
   - Upload a PDF file from UI
   - Verify appears in document list
   - Check backend logs for successful processing

5. **Test Logout**
   - Click logout button
   - Verify returned to login page
   - Verify session cleared

## Security Considerations

### ✅ Implemented Security Measures
- **JWT Token Validation**: All sensitive routes verify token with Supabase
- **Row-Level Security (RLS)**: Database enforces user access control
- **Secure Token Storage**: Uses browser session (secure in production with HTTPS)
- **CORS Protection**: Gateway properly configured for cross-origin requests
- **Encrypted PDF Support**: cryptography library installed for secure file handling
- **No Hardcoded Secrets**: All credentials from environment variables

### ⚠️ Production Recommendations
- Enable HTTPS/TLS for all endpoints
- Set `secure` flag on session cookies
- Implement rate limiting on auth endpoints
- Use .env.local for secrets (never commit to git)
- Rotate Supabase keys regularly
- Monitor authentication failures
- Implement token refresh strategy
- Use environment-specific configurations

## Troubleshooting

### Issue: 401 Unauthorized on Protected Routes
**Solution**: Verify JWT token is properly included in Authorization header
```bash
curl -v http://localhost:3001/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: CORS Errors
**Solution**: Check gateway CORS configuration in `server.js`
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Issue: Supabase Connection Errors
**Solution**: Verify environment variables are set
```bash
echo $SUPABASE_URL
echo $SUPABASE_KEY
```

### Issue: Password Reset
**Solution**: Use Supabase Dashboard → Authentication → Users

## API Response Examples

### Successful Authentication
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "email_confirmed_at": "2026-02-23T10:00:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "expires_in": 3600
  }
}
```

### Unauthorized Request
```json
{
  "error": "Unauthorized",
  "message": "Missing authorization header"
}
```

### Document Upload Success
```json
{
  "document_id": 42,
  "filename": "document.pdf",
  "user_id": "user-uuid",
  "uploaded_at": "2026-02-23T10:00:00Z"
}
```

## Quick Reference

| Component | Port | Purpose |
|-----------|------|---------|
| Frontend | 3000 | React UI, Supabase Auth client |
| Gateway | 3001 | API proxy, JWT validation |
| Backend | 8000 | PDF processing, RLS enforcement |
| Supabase | - | Auth server, Database |

| Endpoint | Method | Auth Required |
|----------|--------|---------------|
| /documents | GET | ✅ Yes |
| /documents/upload | POST | ✅ Yes |
| /query/process | POST | ✅ Yes |
| /health | GET | ❌ No |

## References

- [Supabase Authentication Docs](https://supabase.io/docs/guides/auth)
- [Your Frontend Auth Context](./frontend/src/context/AuthContext.jsx)
- [Gateway Auth Middleware](./gateway/src/middleware/auth.js)
- [Test Script](./test-integration.sh)
