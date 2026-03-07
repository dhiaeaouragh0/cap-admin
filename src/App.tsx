// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ProductList from './pages/Products/ProductList';
import ProductCreate from './pages/Products/ProductCreate';
import ProductEdit from './pages/Products/ProductEdit';
import OrderList from './pages/Orders/OrderList';
import Wilayas from './pages/Wilayas';
import UsersManagement from './pages/UsersManagement';
import { useUserRole } from './hooks/useUserRole';

const queryClient = new QueryClient();

function AppLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  const role = useUserRole();  // ← reactive value from hook

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Root: redirect based on current role */}
              <Route
                path="/"
                element={
                  role === 'admin' ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/orders" replace />
                  )
                }
              />

              {/* Shared routes */}
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/new" element={<ProductCreate />} />
              <Route path="/products/edit/:id" element={<ProductEdit />} />
              <Route path="/orders" element={<OrderList />} />
              <Route path="/wilayas" element={<Wilayas />} />

              {/* Admin-only routes */}
              <Route
                path="/dashboard"
                element={
                  role === 'admin' ? <Dashboard /> : <Navigate to="/orders" replace />
                }
              />

              <Route
                path="/users"
                element={
                  role === 'admin' ? <UsersManagement /> : <Navigate to="/orders" replace />
                }
              />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;