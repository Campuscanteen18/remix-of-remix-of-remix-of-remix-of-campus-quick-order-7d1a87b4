import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCampus } from '@/context/CampusContext';

interface CampusGateProps {
  children: ReactNode;
}

/**
 * CampusGate ensures a campus is selected before allowing access to protected routes.
 * If no campus is selected, redirects to /select-campus.
 */
export function CampusGate({ children }: CampusGateProps) {
  const { hasCampus, isLoading } = useCampus();
  const location = useLocation();

  // Show loading while checking campus
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading campus...</p>
        </div>
      </div>
    );
  }

  // No campus selected - redirect to selector
  if (!hasCampus) {
    return <Navigate to="/select-campus" state={{ from: location }} replace />;
  }

  // Campus is set - render children
  return <>{children}</>;
}
