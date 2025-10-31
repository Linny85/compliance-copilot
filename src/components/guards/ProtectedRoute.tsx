import { Navigate, Outlet } from "react-router-dom";

type Role = 'viewer' | 'member' | 'manager' | 'admin';

interface ProtectedRouteProps {
  isReady: boolean;
  isAuthed: boolean;
  minRole?: Role;
  hasRole?: (r: Role) => boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  isReady,
  isAuthed,
  minRole = 'member',
  hasRole,
  redirectTo = '/auth'
}: ProtectedRouteProps) {
  // Prevent flicker by waiting for auth state to be ready
  if (!isReady) return null;
  
  // Check authentication
  if (!isAuthed) return <Navigate to={redirectTo} replace />;
  
  // Check role if role check function is provided
  if (hasRole && minRole && !hasRole(minRole)) {
    return <Navigate to="/403" replace />;
  }
  
  return <Outlet />;
}
