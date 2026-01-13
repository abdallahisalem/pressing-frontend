# Frontend Update: Enhanced Login Response

The login endpoint has been updated to include additional user information in the response. This provides the frontend with immediate access to user details without additional API calls.

---

## What Changed

### Previous Login Response
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

### New Login Response (Enhanced)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "userId": 1,
  "userName": "System Admin",
  "role": "ADMIN",
  "pressingId": 1,
  "pressingName": "Main Pressing"
}
```

### New Fields Added
- **`userName`** (string): The full name of the authenticated user
- **`pressingName`** (string): The name of the pressing the user belongs to

---

## API Endpoint

### Login
**Endpoint:** `POST /auth/login`
**Auth Required:** ❌ No (public endpoint)

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
  "userName": "System Admin",
  "role": "ADMIN",
  "pressingId": 1,
  "pressingName": "Main Pressing"
}
```

**Response Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `accessToken` | string | JWT token for authentication | `"eyJhbGc..."` |
| `tokenType` | string | Token type (always "Bearer") | `"Bearer"` |
| `expiresIn` | number | Token expiration in seconds | `86400` (24 hours) |
| `userId` | number | Unique user ID | `1` |
| `userName` | string | **NEW** - User's full name | `"System Admin"` |
| `role` | string | User role (ADMIN/SUPERVISOR) | `"ADMIN"` |
| `pressingId` | number | ID of user's pressing | `1` |
| `pressingName` | string | **NEW** - Name of user's pressing | `"Main Pressing"` |

---

## Frontend Implementation Updates

### 1. Update Login State Management

**Before:**
```javascript
const handleLogin = async (loginCode) => {
  const response = await apiClient.post('/auth/login', { loginCode });

  // Store token and basic info
  localStorage.setItem('token', response.data.accessToken);
  localStorage.setItem('userId', response.data.userId);
  localStorage.setItem('role', response.data.role);
  localStorage.setItem('pressingId', response.data.pressingId);
};
```

**After (Enhanced):**
```javascript
const handleLogin = async (loginCode) => {
  const response = await apiClient.post('/auth/login', { loginCode });

  // Store token and enhanced user info
  localStorage.setItem('token', response.data.accessToken);
  localStorage.setItem('userId', response.data.userId);
  localStorage.setItem('userName', response.data.userName); // NEW
  localStorage.setItem('role', response.data.role);
  localStorage.setItem('pressingId', response.data.pressingId);
  localStorage.setItem('pressingName', response.data.pressingName); // NEW

  // Or use a user object
  const user = {
    id: response.data.userId,
    name: response.data.userName,
    role: response.data.role,
    pressing: {
      id: response.data.pressingId,
      name: response.data.pressingName
    }
  };

  localStorage.setItem('user', JSON.stringify(user));
};
```

---

### 2. Update User Context/Store

**State Structure:**
```typescript
interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: {
    id: number;
    name: string;          // NEW - Display in UI
    role: 'ADMIN' | 'SUPERVISOR';
    pressing: {
      id: number;
      name: string;        // NEW - Display in UI
    };
  } | null;
}
```

**Redux/Zustand Example:**
```javascript
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    token: null,
    user: null
  },
  reducers: {
    loginSuccess: (state, action) => {
      const { accessToken, userId, userName, role, pressingId, pressingName } = action.payload;

      state.isAuthenticated = true;
      state.token = accessToken;
      state.user = {
        id: userId,
        name: userName,
        role: role,
        pressing: {
          id: pressingId,
          name: pressingName
        }
      };
    }
  }
});
```

**Context API Example:**
```javascript
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    token: null,
    user: null
  });

  const login = async (loginCode) => {
    const response = await apiClient.post('/auth/login', { loginCode });

    setAuth({
      isAuthenticated: true,
      token: response.data.accessToken,
      user: {
        id: response.data.userId,
        name: response.data.userName,
        role: response.data.role,
        pressing: {
          id: response.data.pressingId,
          name: response.data.pressingName
        }
      }
    });

    // Store in localStorage
    localStorage.setItem('token', response.data.accessToken);
    localStorage.setItem('user', JSON.stringify(auth.user));
  };

  return (
    <AuthContext.Provider value={{ auth, login }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

### 3. Display User Information in UI

**Navigation Bar / Header:**
```jsx
const NavigationBar = () => {
  const { user } = useAuth();

  return (
    <nav>
      <div className="user-info">
        <span className="user-name">{user.name}</span>
        <span className="user-role">{user.role}</span>
        {user.role === 'SUPERVISOR' && (
          <span className="user-pressing">{user.pressing.name}</span>
        )}
      </div>
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
};
```

**User Menu Dropdown:**
```jsx
<UserMenu>
  <Avatar>{user.name.charAt(0)}</Avatar>
  <div>
    <p className="font-bold">{user.name}</p>
    <p className="text-sm text-gray-600">{user.role}</p>
    <p className="text-xs text-gray-500">{user.pressing.name}</p>
  </div>
</UserMenu>
```

**Dashboard Welcome Message:**
```jsx
<Dashboard>
  <h1>Welcome back, {user.name}!</h1>
  <p>You are managing {user.pressing.name}</p>
  {user.role === 'SUPERVISOR' && (
    <Badge>Supervisor</Badge>
  )}
</Dashboard>
```

---

### 4. Benefits of New Fields

#### **userName**
- **Display in UI**: Show user's name in navigation bar, dropdown, dashboard
- **Personalization**: Greet user by name ("Welcome, John!")
- **Audit Trail**: Display who performed actions in logs/history
- **No Extra API Call**: Avoid fetching user details separately

#### **pressingName**
- **Context Display**: Show which pressing the user is working in
- **SUPERVISOR UX**: Show pressing name prominently for supervisors (they can't switch)
- **Breadcrumbs**: Display pressing name in page breadcrumbs
- **Reports**: Include pressing name in printed reports/tickets
- **No Extra API Call**: Avoid fetching pressing details separately

---

### 5. UI Component Examples

#### Navigation Bar with User Info
```jsx
const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="logo">Pressing App</div>

      <div className="user-section">
        {/* User dropdown */}
        <Dropdown>
          <DropdownTrigger>
            <div className="user-info">
              <Avatar name={user.name} />
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs text-gray-500">{user.pressing.name}</p>
              </div>
            </div>
          </DropdownTrigger>

          <DropdownMenu>
            <DropdownItem disabled>
              <div>
                <p>{user.name}</p>
                <p className="text-xs">{user.role}</p>
                <p className="text-xs text-gray-500">{user.pressing.name}</p>
              </div>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={logout}>Logout</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </header>
  );
};
```

#### Dashboard Header
```jsx
const DashboardHeader = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-header">
      <h1>Welcome back, {user.name}!</h1>
      <div className="badges">
        <Badge variant={user.role === 'ADMIN' ? 'primary' : 'secondary'}>
          {user.role}
        </Badge>
        <Badge variant="outline">
          📍 {user.pressing.name}
        </Badge>
      </div>
    </div>
  );
};
```

#### Page Breadcrumbs
```jsx
const Breadcrumbs = ({ currentPage }) => {
  const { user } = useAuth();

  return (
    <nav className="breadcrumbs">
      <Link to="/">Home</Link>
      <span>/</span>
      <span>{user.pressing.name}</span>
      <span>/</span>
      <span>{currentPage}</span>
    </nav>
  );
};
```

---

### 6. TypeScript Interface

If using TypeScript, update your interfaces:

```typescript
// API Response
interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  userName: string;      // NEW
  role: 'ADMIN' | 'SUPERVISOR';
  pressingId: number;
  pressingName: string;  // NEW
}

// User Model
interface User {
  id: number;
  name: string;          // NEW
  role: 'ADMIN' | 'SUPERVISOR';
  pressing: {
    id: number;
    name: string;        // NEW
  };
}

// Auth State
interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
}
```

---

### 7. Example Login Flow

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

const LoginPage = () => {
  const [loginCode, setLoginCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { loginCode });

      // Login returns enhanced user info
      const userData = {
        id: response.data.userId,
        name: response.data.userName,          // NEW
        role: response.data.role,
        pressing: {
          id: response.data.pressingId,
          name: response.data.pressingName     // NEW
        }
      };

      // Update auth context
      login(response.data.accessToken, userData);

      // Show welcome message
      toast.success(`Welcome back, ${userData.name}!`);

      // Redirect based on role
      if (userData.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/supervisor/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid login code');
      } else if (err.response?.status === 403) {
        setError('Your account has been disabled');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={loginCode}
        onChange={(e) => setLoginCode(e.target.value)}
        placeholder="Enter your login code"
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

---

### 8. Persistence & Hydration

**On App Load (check for existing session):**
```javascript
useEffect(() => {
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (token && userJson) {
    const user = JSON.parse(userJson);

    // Restore auth state
    setAuth({
      isAuthenticated: true,
      token,
      user
    });
  }
}, []);
```

**On Logout:**
```javascript
const logout = () => {
  // Clear all auth data
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  // Reset auth state
  setAuth({
    isAuthenticated: false,
    token: null,
    user: null
  });

  // Redirect to login
  navigate('/login');
};
```

---

## Migration Checklist

- [ ] Update login API call to handle new fields (`userName`, `pressingName`)
- [ ] Update user state/store structure to include name and pressing.name
- [ ] Update localStorage to store new fields
- [ ] Display user name in navigation bar/header
- [ ] Display pressing name in UI (especially for SUPERVISOR)
- [ ] Update TypeScript interfaces (if applicable)
- [ ] Add welcome message with user name
- [ ] Update breadcrumbs to include pressing name
- [ ] Test login flow with new response structure
- [ ] Update any code that was manually fetching user/pressing details

---

## Testing

### Test Cases:

**ADMIN Login:**
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginCode": "ADMIN-2024-001"}'
```

Expected Response:
```json
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "userId": 1,
  "userName": "System Admin",
  "role": "ADMIN",
  "pressingId": 1,
  "pressingName": "Main Pressing"
}
```

**SUPERVISOR Login:**
Expected to see their specific pressing name in the response.

---

## Summary

**What's New:**
- ✅ `userName` field in login response
- ✅ `pressingName` field in login response

**Benefits:**
- ✅ No extra API calls needed for user/pressing details
- ✅ Immediate personalization after login
- ✅ Better UX with user and pressing names displayed
- ✅ Reduced network requests on initial load

**Frontend Action Items:**
1. Update login handler to capture new fields
2. Store user name and pressing name in state/localStorage
3. Display user name in navigation/header
4. Display pressing name for context (especially SUPERVISOR)
5. Remove any separate API calls for fetching user/pressing details
6. Update TypeScript types if applicable

**Backward Compatibility:**
- The new fields are additive (not breaking)
- Old frontend code will continue to work
- New code can take advantage of enhanced data
