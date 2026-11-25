'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { registerAction } from '@/features/auth/actions';
import { GoogleOAuthButton } from '@/features/auth/components/google-oauth-button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/layout/language-provider';

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

function isStrongPassword(password: string): boolean {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) return false;
  return /\d/u.test(password) && /[^\p{L}\p{N}\s]/u.test(password);
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isEnglish } = useLanguage();
  const t = (ar: string, en: string) => (isEnglish ? en : ar);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    if (errorParam) setError(errorParam);
    if (messageParam) setMessage(messageParam);
  }, [searchParams, isClient]);

  const passwordLengthOk = password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
  const passwordStrong = isStrongPassword(password);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError('');
    setMessage('');

    const email = String(formData.get('email') || '').trim();

    if (!email) {
      setError(t('أدخل البريد الإلكتروني.', 'Enter your email.'));
      setLoading(false);
      return;
    }

    if (!passwordLengthOk) {
      setError(isEnglish ? `Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.` : `كلمة المرور يجب أن تكون من ${MIN_PASSWORD_LENGTH} إلى ${MAX_PASSWORD_LENGTH} حرفاً.`);
      setLoading(false);
      return;
    }

    if (!passwordStrong) {
      setError(t('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل ورمز خاص واحد على الأقل.', 'Password must contain at least one number and one special character.'));
      setLoading(false);
      return;
    }

    try {
      const result = await registerAction(formData);
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      if (result.next) {
        router.replace(result.next);
        router.refresh();
        return;
      }
      setMessage(result.message || t('تم التسجيل! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.', 'Registered! Check your email to activate your account.'));
      setLoading(false);
    } catch (err) {
      console.error('[auth/register] client action error:', err);
      setError(t('تعذر إنشاء الحساب. حاول مرة أخرى.', 'Could not create the account. Please try again.'));
      setLoading(false);
    }
  };

  if (!isClient) return <div className="text-center py-10">{t('جاري التحميل...', 'Loading...')}</div>;

  return (
    <Card dir={isEnglish ? 'ltr' : 'rtl'} className={`mx-auto max-w-md space-y-6 ${isEnglish ? 'text-left' : 'text-right'}`}>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-brand-gold">{t('إنشاء حساب جديد', 'Create an account')}</h1>
        <p className="text-sm arabic-muted">{t('انضم إلى ذِكر واستمتع بتجربة روحانية متميزة', 'Join Zikr and enjoy a richer spiritual experience')}</p>
      </div>

      {message && (
        <div className="rounded-lg bg-brand-gold/10 border border-brand-gold/30 p-4 text-center">
          <p className="text-sm text-brand-gold font-medium">{message}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
          <p className="text-sm text-red-300 font-medium">{error}</p>
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">{t('البريد الإلكتروني', 'Email')}</label>
          <input id="email" name="email" dir="ltr" type="email" required disabled={loading} placeholder={t('بريدك الإلكتروني', 'Your email')} autoComplete="email" className="w-full rounded-lg border border-brand-gold/20 bg-black/20 p-3 text-brand-cream placeholder:text-brand-cream/40 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold disabled:opacity-50" />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">{t('كلمة المرور', 'Password')}</label>
          <input id="password" name="password" dir="ltr" type="password" required disabled={loading} value={password} onChange={(e) => setPassword(e.target.value)} minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} autoComplete="new-password" placeholder="••••••••••••" className="w-full rounded-lg border border-brand-gold/20 bg-black/20 p-3 text-brand-cream placeholder:text-brand-cream/40 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold disabled:opacity-50" />
          <div className="space-y-1 text-xs">
            <p className={passwordLengthOk ? 'text-brand-gold' : 'text-brand-cream/50'}>
              {password.length}/{MIN_PASSWORD_LENGTH} {t('حرفاً على الأقل', 'characters minimum')}
            </p>
            <p className={/\d/u.test(password) ? 'text-brand-gold' : 'text-brand-cream/50'}>{t('• رقم واحد على الأقل', '• At least one number')}</p>
            <p className={/[^\p{L}\p{N}\s]/u.test(password) ? 'text-brand-gold' : 'text-brand-cream/50'}>{t('• رمز خاص واحد على الأقل', '• At least one special character')}</p>
          </div>
        </div>

        <Button type="submit" disabled={loading || !passwordStrong} className="w-full">
          {loading ? t('جاري الإنشاء...', 'Creating...') : t('إنشاء الحساب', 'Create account')}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-gold/20" /></div>
        <div className="relative flex justify-center text-sm"><span className="bg-brand-emeraldDeep px-4 arabic-muted">{t('أو', 'or')}</span></div>
      </div>

      <GoogleOAuthButton next={searchParams.get('next') || undefined} label={t('إنشاء حساب عبر Google', 'Sign up with Google')} />

      <p className="text-center text-sm arabic-muted">
        {t('لديك حساب بالفعل؟', 'Already have an account?')}{' '}
        <Link href="/auth/login" className="text-brand-gold hover:underline">{t('تسجيل الدخول', 'Sign in')}</Link>
      </p>
    </Card>
  );
}

export function RegisterPage() {
  return (
    <Container className="py-16">
      <Suspense fallback={<div>Loading...</div>}><RegisterForm /></Suspense>
    </Container>
  );
}
