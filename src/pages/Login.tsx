import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

const loginSchema = z.object({
  loginCode: z.string().min(1, 'Login code is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.loginCode);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const message =
        axiosError.response?.data?.message || 'Login failed. Please check your login code.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
            Pressing Management
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your unique login code to continue
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-md" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Input
              {...register('loginCode')}
              type="text"
              label="Login Code"
              placeholder="e.g., ADMIN-2024-001"
              error={errors.loginCode?.message}
              autoComplete="on"
              autoFocus
            />
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Don't have a login code? Contact your administrator.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
