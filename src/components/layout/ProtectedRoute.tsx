import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('adminToken'); // or use context/store later
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}