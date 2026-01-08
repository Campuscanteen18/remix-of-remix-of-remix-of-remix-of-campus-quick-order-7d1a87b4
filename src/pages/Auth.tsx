import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { toast } = useToast();
  const { campus } = useCampus();
  const [isLoading, setIsLoading] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // User is already logged in, redirect based on role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

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
  }, [navigate]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Defer role lookup to prevent deadlock
          setTimeout(async () => {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();

            if (roles?.role === 'admin') {
              navigate('/admin');
            } else if (roles?.role === 'kiosk') {
              navigate('/kiosk-scanner');
            } else {
              navigate('/menu');
            }
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

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
        // Navigation happens via onAuthStateChange
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
        // Check if email confirmation is required
        if (data.user.identities?.length === 0) {
          toast({
            title: 'Email Already Exists',
            description: 'This email is already registered. Please login instead.',
            variant: 'destructive',
          });
        } else if (data.session) {
          // User is auto-confirmed and logged in
          toast({
            title: 'Account Created!',
            description: 'Welcome to Campus Canteen.',
          });
          // Navigation happens via onAuthStateChange
        } else {
          // Email confirmation required
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="w-full max-w-sm">
        {/* Campus Badge */}
        {campus && (
          <div className="flex items-center justify-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary w-fit mx-auto">
            <Building2 size={16} />
            <span className="text-sm font-semibold">{campus.name}</span>
          </div>
        )}
        
        {/* Logo Section */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-xl font-bold text-foreground">{campus?.name || 'Campus'} Canteen</h1>
          <p className="text-sm text-muted-foreground">Sign in to order your favorite food</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-5">
          <Tabs defaultValue="login" className="w-full" onValueChange={clearErrors}>
            <TabsList className="grid w-full grid-cols-2 mb-5 h-10 rounded-xl bg-muted p-1">
              <TabsTrigger value="login" className="rounded-lg text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@college.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className={`h-10 pl-10 text-sm rounded-lg ${errors.loginEmail ? 'border-destructive' : ''}`}
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
                  <Label htmlFor="login-password" className="text-xs font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={`h-10 pl-10 text-sm rounded-lg ${errors.loginPassword ? 'border-destructive' : ''}`}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                  </div>
                  {errors.loginPassword && (
                    <p className="text-xs text-destructive">{errors.loginPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-10 text-sm font-bold rounded-lg gap-2 mt-4" disabled={isLoading}>
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
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs font-medium">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className={`h-10 pl-10 text-sm rounded-lg ${errors.signupName ? 'border-destructive' : ''}`}
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
                  <Label htmlFor="signup-email" className="text-xs font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@college.edu"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className={`h-10 pl-10 text-sm rounded-lg ${errors.signupEmail ? 'border-destructive' : ''}`}
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
                  <Label htmlFor="signup-password" className="text-xs font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className={`h-10 pl-10 text-sm rounded-lg ${errors.signupPassword ? 'border-destructive' : ''}`}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                  </div>
                  {errors.signupPassword && (
                    <p className="text-xs text-destructive">{errors.signupPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-10 text-sm font-bold rounded-lg gap-2 mt-4" disabled={isLoading}>
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

        {/* Switch Campus / Back */}
        <div className="text-center text-xs text-muted-foreground mt-4 space-y-2">
          <button 
            onClick={() => navigate('/select-campus')} 
            className="hover:text-primary transition-colors"
          >
            Switch campus
          </button>
        </div>
      </div>
    </div>
  );
}
