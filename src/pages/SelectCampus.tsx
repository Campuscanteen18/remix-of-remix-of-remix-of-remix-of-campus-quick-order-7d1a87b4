import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useCampus } from '@/context/CampusContext';
import { useToast } from '@/hooks/use-toast';

export default function SelectCampus() {
  const navigate = useNavigate();
  const { setCampusByCode, isLoading } = useCampus();
  const { toast } = useToast();
  
  const [campusCode, setCampusCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const code = campusCode.trim().toUpperCase();
    
    if (!code) {
      setError('Please enter a campus code');
      return;
    }
    
    if (code.length < 2 || code.length > 10) {
      setError('Campus code must be 2-10 characters');
      return;
    }

    const result = await setCampusByCode(code);
    
    if (result.success) {
      toast({
        title: 'Campus Found!',
        description: 'Redirecting to login...',
      });
      navigate('/auth');
    } else {
      setError(result.error || 'Campus not found. Please check the code.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="w-full max-w-sm">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Campus Canteen</h1>
          <p className="text-muted-foreground mt-2">Find your campus to get started</p>
        </div>

        {/* Campus Selector Card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Enter Campus Code</h2>
              <p className="text-sm text-muted-foreground">e.g., MIT, SRM, VIT</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campus-code" className="text-sm font-medium">
                Campus Code
              </Label>
              <Input
                id="campus-code"
                type="text"
                placeholder="Enter code (e.g., MIT)"
                value={campusCode}
                onChange={(e) => {
                  setCampusCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                className={`h-12 text-lg font-mono uppercase tracking-widest text-center ${
                  error ? 'border-destructive' : ''
                }`}
                maxLength={10}
                disabled={isLoading}
                autoFocus
                autoComplete="off"
              />
              
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-bold rounded-xl gap-2"
              disabled={isLoading || !campusCode.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finding Campus...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Don't know your campus code?<br />
          Contact your canteen administrator.
        </p>
      </div>
    </div>
  );
}
