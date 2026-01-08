import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminPinGateProps {
  children: React.ReactNode;
}

export function AdminPinGate({ children }: AdminPinGateProps) {
  const { isAdmin, isAdminAuthenticated, isLoading, hasPin, storedAdminEmail, authenticate, createPin, resetPin } = useAdminAuth();
  const { user, isAuthenticated } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine the admin email to display (from login or stored)
  const adminEmail = user?.email || storedAdminEmail;

  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 60;

  useEffect(() => {
    if (inputRef.current && !isLoading && !isAdminAuthenticated) {
      inputRef.current.focus();
    }
  }, [isLoading, isAdminAuthenticated]);

  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setInterval(() => {
        setLockTimer(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLocked, lockTimer]);

  const handleCreatePin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      toast.error('PINs do not match');
      setConfirmPin('');
      return;
    }

    const success = createPin(pin);
    if (success) {
      toast.success('Admin PIN created successfully!');
      setPin('');
      setConfirmPin('');
    } else {
      toast.error('Failed to create PIN');
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      toast.error(`Too many attempts. Try again in ${lockTimer}s`);
      return;
    }

    if (pin.length < 4) {
      toast.error('Please enter a valid PIN');
      return;
    }

    const success = authenticate(pin);
    
    if (success) {
      toast.success('Welcome to Admin Dashboard');
      setPin('');
      setAttempts(0);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setLockTimer(LOCK_DURATION);
        toast.error(`Too many failed attempts. Locked for ${LOCK_DURATION} seconds.`);
      } else {
        toast.error(`Invalid PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // If admin has PIN stored, they can access with PIN only (no login required)
  // Only show login required if: no user logged in AND no stored admin email with PIN
  if (!isAuthenticated && !user && !storedAdminEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="rounded-3xl card-shadow border-border/50 max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please login first to access admin features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Go to Login
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not an admin (either logged in user or stored email is not admin)
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="rounded-3xl card-shadow border-border/50 max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Your account does not have admin privileges.
              Contact the system administrator for access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already authenticated as admin
  if (isAdminAuthenticated) {
    return <>{children}</>;
  }

  // Admin needs to create PIN (first time)
  if (!hasPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-3xl card-shadow border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4">
                <Logo size="lg" />
              </div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create Admin PIN</CardTitle>
              <CardDescription>
                Welcome! Create a secure PIN to protect your admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Create PIN</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      type={showPin ? 'text' : 'password'}
                      placeholder="Enter 4-6 digit PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 pr-12 h-12 text-center text-xl tracking-[0.5em] rounded-xl"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm PIN</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type={showPin ? 'text' : 'password'}
                      placeholder="Confirm your PIN"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 h-12 text-center text-xl tracking-[0.5em] rounded-xl"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-lg font-semibold"
                  disabled={pin.length < 4 || confirmPin.length < 4}
                >
                  Create PIN & Continue
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Admin needs to enter PIN
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="rounded-3xl card-shadow border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4">
              <Logo size="lg" />
            </div>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <CardDescription>
              Welcome back! Enter your PIN to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyPin} className="space-y-6">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-10 pr-12 h-14 text-center text-2xl tracking-[0.5em] rounded-xl"
                  disabled={isLocked}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {isLocked && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-center"
                  >
                    <div className="bg-destructive/10 text-destructive rounded-xl p-4">
                      <p className="font-medium">Account Temporarily Locked</p>
                      <p className="text-sm mt-1">Try again in {lockTimer} seconds</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {attempts > 0 && !isLocked && (
                <p className="text-sm text-center text-muted-foreground">
                  {MAX_ATTEMPTS - attempts} attempts remaining
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-14 rounded-xl text-lg font-semibold"
                disabled={isLocked || pin.length < 4}
              >
                {isLocked ? `Locked (${lockTimer}s)` : 'Access Dashboard'}
              </Button>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
                
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    resetPin();
                    toast.success('PIN has been reset. Please login again to create a new PIN.');
                  }}
                >
                  Forgot PIN? Reset & Login Again
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}