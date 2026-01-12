# Frontend Context: Code-Based Authentication System

I have a Spring Boot 3.5 backend API with a unique code-based authentication system. I need you to build a React frontend that integrates with this API.

## Backend Overview

The backend implements a **passwordless authentication system** where users authenticate using unique login codes instead of traditional username/password combinations. Key innovation: when an admin regenerates a user's login code, all existing JWT tokens for that user are immediately invalidated via timestamp comparison.

**Base URL (Development):** `http://localhost:8080`

---

## Authentication Flow

1. User enters their unique `loginCode` (e.g., "ADMIN-2024-001")
2. Frontend sends POST request to `/auth/login`
3. Backend validates code and returns JWT token with user details
4. Frontend stores JWT and includes it in all subsequent requests
5. JWT expires after 24 hours or when admin regenerates the user's code

---

## API Endpoints

### 1. **Login** (Public)
**Endpoint:** `POST /auth/login`
**Auth Required:** ❌ No
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "loginCode": "ADMIN-2024-001"
}
```

**Success Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "userId": 1,
  "role": "ADMIN",
  "pressingId": 1
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid login code
  ```json
  {
    "status": 401,
    "message": "Invalid login code",
    "timestamp": "2024-01-15T10:30:00Z"
  }
  ```
- `403 Forbidden` - User account disabled
  ```json
  {
    "status": 403,
    "message": "User account is disabled",
    "timestamp": "2024-01-15T10:30:00Z"
  }
  ```
- `400 Bad Request` - Validation error
  ```json
  {
    "loginCode": "Login code is required"
  }
  ```

---

### 2. **Create User** (Admin Only)
**Endpoint:** `POST /admin/users`
**Auth Required:** ✅ Yes (ADMIN role only)
**Content-Type:** `application/json`
**Authorization Header:** `Bearer <token>`

**Request Body:**
```json
{
  "name": "John Supervisor",
  "role": "SUPERVISOR",
  "pressingId": 1,
  "enabled": true
}
```

**Field Validations:**
- `name`: Required, non-empty string
- `role`: Required, must be "ADMIN" or "SUPERVISOR"
- `pressingId`: Required, must exist in database
- `enabled`: Optional, defaults to `true`

**Success Response (201 Created):**
```json
{
  "id": 2,
  "name": "John Supervisor",
  "loginCode": "A3B5C7D9-12345",
  "role": "SUPERVISOR",
  "pressingId": 1,
  "pressingName": "Main Pressing",
  "enabled": true,
  "lastCodeRegeneratedAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - User is not ADMIN
- `400 Bad Request` - Validation errors or pressing not found

---

### 3. **Regenerate Login Code** (Admin Only)
**Endpoint:** `POST /admin/users/{id}/regenerate-code`
**Auth Required:** ✅ Yes (ADMIN role only)
**Authorization Header:** `Bearer <token>`

**Path Parameter:**
- `{id}`: User ID (Long)

**Success Response (200 OK):**
```json
{
  "id": 2,
  "name": "John Supervisor",
  "loginCode": "F9E7D5C3-67890",
  "role": "SUPERVISOR",
  "pressingId": 1,
  "pressingName": "Main Pressing",
  "enabled": true,
  "lastCodeRegeneratedAt": "2024-01-15T14:45:00Z",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Important:** After this call, ALL existing JWT tokens for this user become invalid immediately.

**Error Responses:**
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - User is not ADMIN
- `400 Bad Request` - User not found

---

## JWT Token Details

### Token Structure
The JWT contains these claims:
```json
{
  "sub": "1",           // User ID as string
  "userId": 1,          // User ID as number
  "role": "ADMIN",      // User role (ADMIN or SUPERVISOR)
  "pressingId": 1,      // Business location ID
  "iat": 1705318200,    // Issued at timestamp (Unix)
  "exp": 1705404600     // Expiration timestamp (Unix)
}
```

### Token Usage
- **Header Name:** `Authorization`
- **Format:** `Bearer <token>`
- **Expiration:** 24 hours from issuance
- **Validation:** Token is checked on EVERY request to protected endpoints

### Token Storage (Frontend Recommendations)
1. **Development:** localStorage is acceptable
2. **Production:** Consider httpOnly cookies for security
3. Store user info separately (userId, role, pressingId) for UI logic
4. Clear token on logout or 401/403 errors

---

## User Roles & Permissions

### ADMIN
- ✅ Can create new users
- ✅ Can regenerate login codes for any user
- ✅ Can access all `/admin/**` endpoints
- ✅ Typically manages multiple pressings

### SUPERVISOR
- ❌ Cannot access `/admin/**` endpoints
- ✅ Can access other protected endpoints (to be implemented)
- ✅ Typically tied to a specific pressing

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Display success message |
| 201 | Created | Display new resource |
| 400 | Bad Request | Show validation errors |
| 401 | Unauthorized | Clear token, redirect to login |
| 403 | Forbidden | Show "Access Denied" message |
| 500 | Server Error | Show generic error message |

### Error Response Format
```json
{
  "status": 401,
  "message": "Token was issued before login code regeneration and is no longer valid",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Validation Errors Format
```json
{
  "name": "Name is required",
  "role": "Role is required",
  "pressingId": "Pressing ID is required"
}
```

---

## Frontend Requirements

### 1. **Login Page**
- Input field for login code
- Submit button
- Display errors clearly
- Redirect to dashboard on success
- Show loading state during authentication

### 2. **Dashboard/Home Page**
- Display user info (name, role, pressing)
- Show different UI based on role (ADMIN vs SUPERVISOR)
- Logout button

### 3. **Admin Panel** (ADMIN only)
- Create new user form
  - Name input
  - Role selector (dropdown: ADMIN, SUPERVISOR)
  - Pressing selector (dropdown)
  - Enabled checkbox (default: true)
- User list/table showing:
  - ID, Name, Login Code, Role, Pressing, Status
  - "Regenerate Code" button per user
  - Copy login code button
- Success/error toast notifications

### 4. **Authentication Guards**
- Redirect to login if no token
- Check role before rendering admin routes
- Handle 401/403 by clearing token and redirecting to login

### 5. **API Client Setup**
Example structure:
```javascript
// api.js
const API_BASE_URL = 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403 globally
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## State Management Suggestions

### User Context/Store
```javascript
{
  isAuthenticated: boolean,
  token: string | null,
  user: {
    id: number,
    role: 'ADMIN' | 'SUPERVISOR',
    pressingId: number
  } | null
}
```

### Actions Needed
- `login(loginCode)` - Authenticate user
- `logout()` - Clear token and redirect
- `createUser(userData)` - Admin creates new user
- `regenerateCode(userId)` - Admin regenerates code
- `checkAuth()` - Verify token on app load

---

## Environment Configuration

### Development
```env
REACT_APP_API_BASE_URL=http://localhost:8080
```

### Production
```env
REACT_APP_API_BASE_URL=https://api.yourdomain.com
```

---

## Testing Credentials

**Default Admin User:**
- **Login Code:** `ADMIN-2024-001`
- **Role:** ADMIN
- **Pressing ID:** 1

---

## Key Security Considerations

1. **Token Invalidation:** When a code is regenerated, existing tokens become invalid immediately
2. **No Refresh Tokens:** Users must re-login after 24 hours
3. **Role-Based UI:** Hide admin features from SUPERVISOR users
4. **Error Messages:** Don't expose sensitive information
5. **CORS:** Backend allows all origins in dev, configure properly for production

---

## User Experience Flow

### Happy Path
1. User receives login code from admin (e.g., "A3B5C7D9-12345")
2. User enters code on login page
3. System validates and returns JWT
4. User sees dashboard appropriate for their role
5. ADMIN can create users and see their generated codes
6. ADMIN can regenerate codes when needed

### Code Regeneration Scenario
1. Admin clicks "Regenerate Code" for a user
2. New code is generated (e.g., "F9E7D5C3-67890")
3. Admin copies new code to share with user
4. User's old tokens immediately stop working
5. User must login again with new code

---

## Design Recommendations

### UI Components Needed
1. Login form (centered, clean, minimal)
2. Dashboard layout (navbar with user info + logout)
3. Admin panel (sidebar navigation)
4. User creation form (modal or separate page)
5. User list table (with actions)
6. Toast/notification system for success/errors
7. Loading indicators
8. Role-based route guards

### Suggested Libraries
- **React Router** - Routing and guards
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod/Yup** - Validation
- **Tailwind CSS** - Styling (or Material-UI, Ant Design)
- **React Toastify** - Notifications
- **Zustand/Context API** - State management

---

## Additional Notes

1. **No Password Fields:** The system deliberately has no passwords - only codes
2. **Multi-Tenancy:** The `pressingId` field enables multiple business locations
3. **Code Format:** Login codes are UUID-based (8 chars + timestamp)
4. **Stateless Backend:** No sessions, fully JWT-based
5. **Database:** Backend uses PostgreSQL with Flyway migrations

---

## Questions to Clarify

Before starting implementation, please confirm:
1. Should I use TypeScript or JavaScript?
2. Preferred UI framework (Material-UI, Ant Design, Tailwind, custom)?
3. State management preference (Context API, Zustand, Redux)?
4. Should we implement user edit/delete functionality?
5. Do you want a user details/profile page?
6. Should SUPERVISOR role have any specific features beyond viewing their own info?

---

## Summary

Build a React frontend with:
- ✅ Login page (code-based, no password)
- ✅ Dashboard showing user info based on role
- ✅ Admin panel for user management (ADMIN only)
- ✅ Create users with auto-generated codes
- ✅ Regenerate codes functionality
- ✅ JWT token management with automatic logout on 401/403
- ✅ Role-based routing and UI rendering
- ✅ Clean, modern UI with proper error handling

The authentication system is unique - focus on making the code input/display UX smooth since users will be copying/pasting these codes.
