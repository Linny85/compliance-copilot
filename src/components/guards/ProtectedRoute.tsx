import { Navigate, Outlet } from "react-router-dom";

type Role = 'viewer' | 'member' | 'manager' | 'admin';

interface ProtectedRouteProps {
  authReady: boolean | null; // null = unknown, false = loading, true = ready
  isAuthed: boolean;
  minRole?: Role;
  hasRole?: (r: Role) => boolean;
  redirectTo?: string;
  children?: React.ReactNode;
}

/**
 * ProtectedRoute - Prevents guard race conditions (flash-then-redirect)
 * 
 * Key improvements:
 * - Uses authReady (null|false|true) instead of just isReady
 * - Renders nothing until auth state is definitive (null check)
 * - Supports both Outlet pattern and children pattern
 * - Clean redirects with replace to avoid history pollution
 */
export default function ProtectedRoute({
  authReady,
  isAuthed,
  minRole = 'member',
  hasRole,
  redirectTo = '/auth',
  children
}: ProtectedRouteProps) {
  // Don't render anything until auth state is definitive
  // This prevents flash of protected content before redirect
  if (authReady === null) {
    return null; // Or return <LoadingSpinner /> if preferred
  }
  
  // Check authentication
  if (!isAuthed) {
    return <Navigate to={redirectTo} replace />;
  }
  
  // Check role if role check function is provided
  if (hasRole && minRole && !hasRole(minRole)) {
    return <Navigate to="/forbidden" replace />;
  }
  
  // Render children if provided, otherwise use Outlet
  return children ? <>{children}</> : <Outlet />;
}
