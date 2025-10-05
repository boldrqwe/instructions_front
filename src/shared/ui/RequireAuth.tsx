import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../model/auth';

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAdmin } = useAuth();
  const loc = useLocation();
  if (!isAdmin) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  return children;
}
