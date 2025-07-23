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
import { AuthLayout } from './AuthLayout';

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
    <AuthLayout 
      title="Create an account" 
      subtitle="Enter your information to create your account"
    >
      {/* Google OAuth Button */}
      <Button
        variant="outline"
        className="w-full mb-6 bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 rounded-lg shadow-none text-base font-medium flex items-center justify-center gap-2"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        aria-label="Continue with Google"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-500">
            Or continue with
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

      <div className="text-center text-sm mt-6 text-slate-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 font-semibold hover:underline"
          disabled={isLoading}
          aria-label="Switch to sign in form"
        >
          Sign in
        </button>
      </div>
    </AuthLayout>
  );
}; 