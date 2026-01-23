import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
