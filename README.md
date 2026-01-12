# Pressing Management System - Frontend

A React TypeScript frontend for the code-based authentication system integrated with Spring Boot backend.

## Features

- **Code-Based Authentication**: Passwordless login using unique login codes
- **Role-Based Access Control**: ADMIN and SUPERVISOR roles with different permissions
- **User Management**: Create, edit, delete users, and regenerate login codes
- **JWT Token Management**: Automatic token handling with 24-hour expiration
- **Responsive Design**: Built with Tailwind CSS for a modern, clean UI
- **Form Validation**: React Hook Form with Zod schema validation
- **Toast Notifications**: Real-time feedback for user actions

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **React Toastify** - Notifications
- **Context API** - State management

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8080`

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env if needed (default: http://localhost:8080)
VITE_API_BASE_URL=http://localhost:8080
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── api/              # API client and endpoints
│   ├── client.ts     # Axios instance with interceptors
│   ├── auth.ts       # Authentication API
│   └── users.ts      # User management API
├── components/       # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Select.tsx
│   └── ProtectedRoute.tsx
├── contexts/         # React Context providers
│   └── AuthContext.tsx
├── pages/           # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   └── AdminUsers.tsx
├── types/           # TypeScript type definitions
│   └── index.ts
├── App.tsx          # Main app component with routing
└── main.tsx         # Entry point
```

## Usage

### Login

1. Navigate to the login page
2. Enter your unique login code (e.g., `ADMIN-2024-001`)
3. Click "Sign In"

**Default Admin Credentials:**
- Login Code: `ADMIN-2024-001`

### Dashboard

After login, you'll see the dashboard with:
- Your role information
- Quick access to admin functions (ADMIN only)
- Logout button

### Admin Functions (ADMIN Role Only)

**User Management:**
- **Create User**: Add new users with auto-generated login codes
- **Edit User**: Update user details, role, pressing, or status
- **Delete User**: Remove users from the system
- **Regenerate Code**: Generate new login code (invalidates existing tokens)
- **Copy Code**: Quickly copy login codes to clipboard

## API Integration

The frontend integrates with the following backend endpoints:

- `POST /auth/login` - User authentication
- `GET /admin/users` - List all users
- `POST /admin/users` - Create new user
- `PUT /admin/users/{id}` - Update user
- `DELETE /admin/users/{id}` - Delete user
- `POST /admin/users/{id}/regenerate-code` - Regenerate login code

## Authentication Flow

1. User enters login code on login page
2. Frontend sends POST to `/auth/login`
3. Backend validates and returns JWT token
4. Token stored in localStorage
5. Token automatically added to all API requests via interceptor
6. On 401/403 errors, user is logged out and redirected to login

## Security Features

- JWT token validation on every request
- Automatic logout on token expiration
- Role-based route protection
- Token invalidation when code is regenerated
- Protected admin routes require ADMIN role

## Development Notes

- TypeScript strict mode enabled
- ESLint configured for code quality
- All API errors handled with user-friendly messages
- Loading states for all async operations
- Form validation with Zod schemas

## Troubleshooting

**Build errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API connection issues:**
- Ensure backend is running on `http://localhost:8080`
- Check CORS configuration on backend
- Verify `.env` file has correct API URL

**Login issues:**
- Verify login code exists in backend database
- Check backend logs for authentication errors
- Ensure user account is enabled

## License

Private project - All rights reserved
