// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner'; // if you added sonner via shadcn
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ProductList from './pages/Products/ProductList';
import ProductCreate from './pages/Products/ProductCreate';
import OrderList from './pages/Orders/OrderList';
import Wilayas from './pages/Wilayas';
import Categories from './pages/Categories';

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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/products" element={<ProductList />} />
            <Route path="/products/new" element={<ProductCreate />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/wilayas" element={<Wilayas />} />
          </Route>
          
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;