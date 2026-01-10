import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/Logo';
import { useCampus } from '@/context/CampusContext';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Mail, Lock, User, ArrowRight, Loader2, Building2 } from 'lucide-react';

// Validation schemas
const emailSchema = z.string().trim().email('Please enter a valid email address').max(255, 'Email is too long');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password is too long');
const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { campus } = useCampus();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle logout parameter
  useEffect(() => {
    const shouldLogout = searchParams.get('logout') === 'true';
    if (!shouldLogout) return;

    let cancelled = false;

    (async () => {
      setIsLoggingOut(true);
      await supabase.auth.signOut();

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      setIsLoggingOut(false);
      if (!session) {
        navigate('/auth', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  // Check for existing session
  useEffect(() => {
    if (isLoggingOut) return;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (roles?.role === 'admin') {
          navigate('/admin');
        } else if (roles?.role === 'kiosk') {
          navigate('/kiosk-scanner');
        } else {
          navigate('/menu');
        }
      }
    };

    checkSession();
  }, [navigate, isLoggingOut]);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(async () => {
          const [rolesResult, profileResult] = await Promise.all([
            supabase
              .from('user_roles')
              .select('role, campus_id')
              .eq('user_id', session.user.id)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('campus_id')
              .eq('user_id', session.user.id)
              .maybeSingle(),
          ]);

          const userRole = rolesResult.data?.role;
          const userHomeCampusId = profileResult.data?.campus_id || rolesResult.data?.campus_id;
          const currentCampusId = campus?.id;

          if (userRole === 'admin' || userRole === 'kiosk') {
            if (currentCampusId && userHomeCampusId && currentCampusId !== userHomeCampusId) {
              toast({
                title: 'Access Denied',
                description: 'You can only access the admin dashboard at your home campus.',
                variant: 'destructive',
              });
              await supabase.auth.signOut();
              return;
            }
            navigate(userRole === 'admin' ? '/admin' : '/kiosk-scanner');
          } else {
            if (currentCampusId && userHomeCampusId && currentCampusId !== userHomeCampusId) {
              toast({
                title: 'Welcome, Visitor! 🎉',
                description: `You are visiting ${campus?.name || 'this campus'}. Enjoy your meal!`,
              });
            }
            navigate('/menu');
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, campus, toast]);

  const clearErrors = () => setErrors({});

  const validateLoginForm = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      emailSchema.parse(loginEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        newErrors.loginEmail = err.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        newErrors.loginPassword = err.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignupForm = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      nameSchema.parse(signupName);
    } catch (err) {
      if (err instanceof z.ZodError) {
        newErrors.signupName = err.errors[0].message;
      }
    }
    
    try {
      emailSchema.parse(signupEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        newErrors.signupEmail = err.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(signupPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        newErrors.signupPassword = err.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    
    if (!validateLoginForm()) return;

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message === 'Invalid login credentials' 
            ? 'Invalid email or password. Please try again.' 
            : error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in.',
        });
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    
    if (!validateSignupForm()) return;

    if (!campus?.id) {
      toast({
        title: 'Campus Required',
        description: 'Please select a campus before signing up.',
        variant: 'destructive',
      });
      navigate('/select-campus');
      return;
    }

    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            campus_id: campus.id,
            full_name: signupName.trim(),
          },
        },
      });
      
      if (error) {
        let errorMessage = error.message;
        
        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please login instead.';
        }
        
        toast({
          title: 'Signup Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        if (data.user.identities?.length === 0) {
          toast({
            title: 'Email Already Exists',
            description: 'This email is already registered. Please login instead.',
            variant: 'destructive',
          });
        } else if (data.session) {
          toast({
            title: 'Account Created!',
            description: 'Welcome to Campus Canteen.',
          });
        } else {
          toast({
            title: 'Check Your Email',
            description: 'We sent you a confirmation link. Please check your inbox.',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Signup Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Subtle background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-secondary/[0.02]" />
      
      <div className="relative w-full max-w-[380px]">
        {/* Campus Badge */}
        {campus && (
          <div className="flex items-center justify-center gap-2 mb-5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground w-fit mx-auto">
            <Building2 size={14} />
            <span className="text-xs font-medium">{campus.name}</span>
          </div>
        )}
        
        {/* Logo Section */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            {campus?.name || 'Campus'} Canteen
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to order your favorite food
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-soft border border-border p-5">
          <Tabs defaultValue="login" className="w-full" onValueChange={clearErrors}>
            <TabsList className="grid w-full grid-cols-2 mb-5 h-10 rounded-xl bg-muted p-1">
              <TabsTrigger 
                value="login" 
                className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@college.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className={`h-11 pl-10 rounded-xl ${errors.loginEmail ? 'border-destructive' : ''}`}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                  {errors.loginEmail && (
                    <p className="text-xs text-destructive">{errors.loginEmail}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={`h-11 pl-10 rounded-xl ${errors.loginPassword ? 'border-destructive' : ''}`}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                  </div>
                  {errors.loginPassword && (
                    <p className="text-xs text-destructive">{errors.loginPassword}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 font-semibold rounded-xl gap-2 mt-2" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs font-medium text-muted-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className={`h-11 pl-10 rounded-xl ${errors.signupName ? 'border-destructive' : ''}`}
                      required
                      disabled={isLoading}
                      autoComplete="name"
                    />
                  </div>
                  {errors.signupName && (
                    <p className="text-xs text-destructive">{errors.signupName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@college.edu"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className={`h-11 pl-10 rounded-xl ${errors.signupEmail ? 'border-destructive' : ''}`}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                  {errors.signupEmail && (
                    <p className="text-xs text-destructive">{errors.signupEmail}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className={`h-11 pl-10 rounded-xl ${errors.signupPassword ? 'border-destructive' : ''}`}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                  </div>
                  {errors.signupPassword && (
                    <p className="text-xs text-destructive">{errors.signupPassword}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 font-semibold rounded-xl gap-2 mt-2" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-5">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
