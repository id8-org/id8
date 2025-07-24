import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';

const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  accept_terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms and Privacy Policy' })
  }),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithToken } = useAuth();
  const { toast } = useToast();
  const { signInWithGoogle } = useGoogleAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const result = await response.json();
      await loginWithToken(result.access_token);
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : 'Registration failed',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Success",
        description: "Google sign-up successful!",
      });
    } catch (error) {
      console.error('Google sign-up error:', error);
      toast({
        title: "Google Sign-up Failed",
        description: error instanceof Error ? error.message : 'Google sign-up failed',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout heroImageSrc="/path/to/hero-image.jpg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <h2>Sign Up</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              placeholder="Enter your first name"
              {...register('first_name')}
              disabled={isLoading}
              aria-label="First name"
            />
            {errors.first_name && (
              <p className="text-sm text-red-500" role="alert">{errors.first_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              placeholder="Enter your last name"
              {...register('last_name')}
              disabled={isLoading}
              aria-label="Last name"
            />
            {errors.last_name && (
              <p className="text-sm text-red-500" role="alert">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            {...register('email')}
            disabled={isLoading}
            aria-label="Email address"
          />
          {errors.email && (
            <p className="text-sm text-red-500" role="alert">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            {...register('password')}
            disabled={isLoading}
            aria-label="Password"
          />
          {errors.password && (
            <p className="text-sm text-red-500" role="alert">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm password</Label>
          <Input
            id="confirm_password"
            type="password"
            placeholder="Confirm your password"
            {...register('confirm_password')}
            disabled={isLoading}
            aria-label="Confirm password"
          />
          {errors.confirm_password && (
            <p className="text-sm text-red-500" role="alert">{errors.confirm_password.message}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="accept_terms"
            {...register('accept_terms')}
            disabled={isLoading}
            className="accent-blue-500"
            aria-label="Accept terms and privacy policy"
          />
          <Label htmlFor="accept_terms" className="text-sm">
            I agree to the
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline ml-1">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>
          </Label>
        </div>
        {errors.accept_terms && (
          <p className="text-sm text-red-500" role="alert">{errors.accept_terms.message}</p>
        )}

        <Button 
          type="submit" 
          className="w-full py-3 mt-6 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-none transition-all duration-200 focus:ring-2 focus:ring-blue-400" 
          disabled={isLoading}
          aria-label={isLoading ? "Creating account..." : "Create account"}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
};