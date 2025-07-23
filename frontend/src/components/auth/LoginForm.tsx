import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { AuthLayout } from './AuthLayout';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, loginWithToken } = useAuth();
  const { toast } = useToast();
  const { signInWithGoogle } = useGoogleAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Success",
        description: "Google sign-in successful!",
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Google Sign-in Failed",
        description: error instanceof Error ? error.message : 'Google sign-in failed',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const result = await response.json();
      await loginWithToken(result.access_token);
      toast({
        title: "Success",
        description: "Welcome back!",
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : 'Login failed',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Log in to your account" 
      subtitle="Welcome back! Please enter your details."
    >
      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email Field */}
        <div>
          <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            className="mt-1 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-slate-900 text-base px-3 py-2"
            disabled={isLoading}
            {...register('email')}
            aria-label="Email address"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1" role="alert">{errors.email.message}</p>
          )}
        </div>
        
        {/* Password Field */}
        <div>
          <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••"
              className="mt-1 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-slate-900 pr-10 text-base px-3 py-2"
              disabled={isLoading}
              {...register('password')}
              aria-label="Password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1" role="alert">{errors.password.message}</p>
          )}
        </div>
        
        {/* Remember me and Forgot Password Row */}
        <div className="flex items-center justify-between mt-1">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" className="accent-blue-500 w-4 h-4" aria-label="Remember me for 30 days" />
            Remember for 30 days
          </label>
          <button 
            type="button" 
            className="text-xs text-blue-500 hover:underline font-medium"
            aria-label="Reset password"
          >
            Forgot Password?
          </button>
        </div>
        
        {/* Login Button */}
        <Button
          type="submit"
          className="w-full py-3 mt-6 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-none transition-all duration-200 focus:ring-2 focus:ring-blue-400"
          disabled={isLoading}
          aria-label={isLoading ? "Logging in..." : "Log in to your account"}
        >
          {isLoading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Log In'}
        </Button>
      </form>
      
      {/* Google OAuth Button */}
      <div className="mt-6">
        <Button
          variant="outline"
          className="w-full bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 rounded-lg shadow-none text-base font-medium flex items-center justify-center gap-2"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          aria-label="Continue with Google"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>
      </div>
      
      {/* Sign up link */}
      <div className="text-center mt-6 text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <button 
          type="button" 
          className="text-blue-600 font-semibold hover:underline ml-1" 
          onClick={onSwitchToRegister}
          aria-label="Switch to sign up form"
        >
          Sign up
        </button>
      </div>
    </AuthLayout>
  );
}; 