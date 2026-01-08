import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Logo size="lg" className="mb-8" />
      
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-primary/20 mb-4">404</div>
        <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="gap-2 rounded-full"
          >
            <ArrowLeft size={18} />
            Go Back
          </Button>
          <Button 
            onClick={() => navigate('/')}
            className="gap-2 rounded-full"
          >
            <Home size={18} />
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
