import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, LanguageSwitcher } from '../components';

const loginSchema = z.object({
  loginCode: z.string().min(1, 'Login code is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.loginCode);
      toast.success(t('auth.successMessage'));
      navigate('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || t('auth.errorDefault');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Top Header Section */}
        <div className="flex flex-col items-center text-center space-y-4">

                        <img src="/img/logo.png" alt="Logo" className="h-20 w-20" />

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              {t('auth.loginTitle')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('auth.loginCodePlaceholder')}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <form 
          className="mt-8 space-y-6" 
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-1">
            <Input
              {...register('loginCode')}
              // label={t('auth.loginCode')}
              placeholder="••••••••"
              error={errors.loginCode?.message}
              className="block w-full rounded-xl border-gray-300 transition-focus focus:ring-2 focus:ring-black"
              autoFocus
            />
          </div>

          <Button 
            type="submit" 
            className="w-full py-4 bg-black text-white rounded-xl font-medium transition-transform active:scale-[0.98] disabled:opacity-70"
            isLoading={isLoading}
          >
            {t('auth.loginButton')}
          </Button>

          <div className="pt-2 border-t border-gray-50">
            <p className="text-center text-xs leading-relaxed text-gray-400">
              {t('auth.adminContact')}
            </p>
          </div>
        </form>
        {/* Footer Link */}
        <div dir="ltr" className="mt-8 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};