import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the attempted URL
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check if email is verified
  if (!user.email_confirmed_at) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-8 bg-card rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
          <p className="text-muted-foreground mb-4">
            Please check your email and click the verification link to access your account.
          </p>
          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or contact support.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
