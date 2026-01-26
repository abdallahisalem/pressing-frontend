import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components';
import { Login, Dashboard, AdminUsers, AdminPlants, Clients, Pressings, Orders, OrderCreate, OrderDetails, PressingItems } from './pages';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Only Routes */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/plants"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminPlants />
              </ProtectedRoute>
            }
          />

          {/* Pressing Management Routes */}
          <Route
            path="/pressings"
            element={
              <ProtectedRoute>
                <Pressings />
              </ProtectedRoute>
            }
          />

          {/* Client Management Routes */}
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />

          {/* Pressing Items Management Routes (ADMIN and SUPERVISOR) */}
          <Route
            path="/pressing-items"
            element={
              <ProtectedRoute>
                <PressingItems />
              </ProtectedRoute>
            }
          />

          {/* Order Management Routes */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/new"
            element={
              <ProtectedRoute>
                <OrderCreate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 - Redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Toast Notification Container */}
        <Toaster
          position="top-right"
          expand={true}
          richColors
          closeButton
          toastOptions={{
            duration: 3000,
            style: {
              background: 'white',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
