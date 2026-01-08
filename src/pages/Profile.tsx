import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { z } from 'zod';

// Validation schemas
const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');
const emailSchema = z.string().trim().email('Please enter a valid email address').max(255, 'Email is too long');
const phoneSchema = z.string().trim().regex(/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number').optional().or(z.literal(''));

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, updateUser, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      nameSchema.parse(formData.fullName);
    } catch (err) {
      if (err instanceof z.ZodError) {
        newErrors.fullName = err.errors[0].message;
      }
    }
    
    try {
      emailSchema.parse(formData.email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        newErrors.email = err.errors[0].message;
      }
    }
    
    if (formData.phone) {
      try {
        phoneSchema.parse(formData.phone);
      } catch (err) {
        if (err instanceof z.ZodError) {
          newErrors.phone = err.errors[0].message;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    updateUser({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined
    });
    
    setIsSaving(false);
    
    toast({
      title: 'Profile Updated!',
      description: 'Your changes have been saved successfully.',
    });
    
    navigate('/menu');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center gap-4 p-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/menu')}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Edit Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold mb-4">
            {getInitials(formData.fullName || 'GU')}
          </div>
          <p className="text-sm text-muted-foreground">Your profile photo</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className={`h-12 pl-11 text-base rounded-xl ${errors.fullName ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`h-12 pl-11 text-base rounded-xl ${errors.email ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your 10-digit phone number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                className={`h-12 pl-11 text-base rounded-xl ${errors.phone ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
            <p className="text-xs text-muted-foreground">Optional - for order updates</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 text-base font-bold rounded-xl gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
