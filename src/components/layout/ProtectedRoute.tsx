// src/components/layout/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const token = localStorage.getItem('adminToken');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Sécurité : si rôle incohérent → déconnexion automatique
  if (!role || (role !== 'admin' && role !== 'confirmateur')) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userRole');
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}