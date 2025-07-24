import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import AuthLayout from './AuthLayout';
import heroImage from '../../assets/hero.png';

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

  const { loginWithToken } = useAuth();
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
        title: 'Success',
        description: 'Google sign-in successful!',
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: 'Google Sign-in Failed',
        description: error instanceof Error ? error.message : 'Google sign-in failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: data.email,
            password: data.password,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const result = await response.json();
      await loginWithToken(result.access_token);

      toast({
        title: 'Success',
        description: 'Welcome back!',
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout heroImageSrc={heroImage}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <h2 className="text-2xl font-semibold">Login</h2>

        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              {...register('password')}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging in...
            </>
          ) : (
            'Login'
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full"
        >
          Sign in with Google
        </Button>

        <div className="text-sm text-center">
          Don’t have an account?{' '}
          <button
            type="button"
            className="underline text-primary"
            onClick={onSwitchToRegister}
          >
            Register
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginForm;