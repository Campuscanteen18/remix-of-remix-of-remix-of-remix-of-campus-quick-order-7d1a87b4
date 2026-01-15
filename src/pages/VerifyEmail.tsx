import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'pending'>('verifying');
  const [email, setEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      // Check URL hash for token (Supabase redirects with hash)
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (type === 'signup' && accessToken) {
        // Email was just verified via link
        setStatus('success');
        toast({
          title: 'Email Verified!',
          description: 'Your email has been verified successfully.',
        });
        
        // Redirect to menu after 2 seconds
        setTimeout(() => {
          navigate('/menu');
        }, 2000);
        return;
      }

      // Check if user is already logged in and verified
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        if (session.user.email_confirmed_at) {
          setStatus('success');
          setTimeout(() => navigate('/menu'), 2000);
        } else {
          setEmail(session.user.email || null);
          setStatus('pending');
        }
      } else {
        // No session, check for error in URL
        const error = searchParams.get('error');
        if (error) {
          setStatus('error');
        } else {
          setStatus('pending');
        }
      }
    };

    checkVerification();
  }, [navigate, searchParams, toast]);

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'No email address found. Please sign up again.',
        variant: 'destructive',
      });
      return;
    }

    setIsResending(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Email Sent!',
        description: 'A new verification email has been sent.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend verification email.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-secondary/[0.02]" />
        
        <div className="relative w-full max-w-[380px] text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <h1 className="font-display text-xl font-semibold text-foreground mb-2">
            Email Verified!
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your email has been verified successfully. Redirecting...
          </p>
          
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-secondary/[0.02]" />
        
        <div className="relative w-full max-w-[380px] text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
          </div>
          
          <h1 className="font-display text-xl font-semibold text-foreground mb-2">
            Verification Failed
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            The verification link is invalid or has expired. Please request a new one.
          </p>
          
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Back to Login
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Sign Up Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pending verification state
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-secondary/[0.02]" />
      
      <div className="relative w-full max-w-[380px]">
        {/* Logo Section */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Verify Your Email
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            We've sent a verification link to your email
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-card rounded-2xl shadow-soft border border-border p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          
          {email && (
            <p className="text-sm text-muted-foreground mb-4">
              Sent to: <strong className="text-foreground">{email}</strong>
            </p>
          )}
          
          <p className="text-sm text-muted-foreground mb-6">
            Click the link in the email to verify your account. Check your spam folder if you don't see it.
          </p>
          
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleResendVerification}
            disabled={isResending || !email}
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Resend Verification Email
              </>
            )}
          </Button>
        </div>

        {/* Back to Login */}
        <div className="text-center mt-5">
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/auth')}
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
