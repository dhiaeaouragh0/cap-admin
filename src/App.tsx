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

const queryClient = new QueryClient();

// Helper pour lire le rôle de façon propre et à jour
function getUserRole() {
  return localStorage.getItem('userRole') || 'confirmateur';
}

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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Page publique */}
          <Route path="/login" element={<Login />} />

          {/* Toutes les routes protégées */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Racine : redirection selon rôle */}
              <Route
                path="/"
                element={
                  getUserRole() === 'admin' ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/orders" replace />
                  )
                }
              />

              {/* Routes communes (admin + confirmateur) */}
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/new" element={<ProductCreate />} />
              <Route path="/products/edit/:id" element={<ProductEdit />} />
              <Route path="/orders" element={<OrderList />} />
              <Route path="/wilayas" element={<Wilayas />} />

              {/* Routes réservées ADMIN UNIQUEMENT */}
              <Route
                path="/dashboard"
                element={
                  getUserRole() === 'admin' ? (
                    <Dashboard />
                  ) : (
                    <Navigate to="/orders" replace />
                  )
                }
              />

              <Route
                path="/users"
                element={
                  getUserRole() === 'admin' ? (
                    <UsersManagement />
                  ) : (
                    <Navigate to="/orders" replace />
                  )
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