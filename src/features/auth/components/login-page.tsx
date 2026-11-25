'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { loginAction } from '@/features/auth/actions';
import { GoogleOAuthButton } from '@/features/auth/components/google-oauth-button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/layout/language-provider';

const MESSAGE_MAP: Record<string, string> = {
  check_email: 'تم التسجيل! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.',
  reset_sent: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.',
  auth_callback_failed: 'فشل تسجيل الدخول عبر Google. حاول مرة أخرى.',
  auth_pkce_expired: 'انتهت جلسة Google أو بدأ تسجيل الدخول من نافذة/جهاز آخر. اضغط متابعة باستخدام Google مرة أخرى من هذا المتصفح.',
  auth_session_missing: 'لم تكتمل جلسة تسجيل الدخول. حاول مرة أخرى.',
  google_oauth_unavailable: 'تسجيل الدخول عبر Google غير متاح حاليًا.',
  google_oauth_failed: 'تعذر بدء تسجيل الدخول عبر Google. حاول مرة أخرى.',
  password_updated: 'تم تحديث كلمة المرور بنجاح. يمكنك الدخول الآن.',
};

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isEnglish } = useLanguage();
  const t = (ar: string, en: string) => (isEnglish ? en : ar);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    const errorParam = searchParams.get('error');
    const msgParam = searchParams.get('message');
    if (errorParam) {
      setError(MESSAGE_MAP[errorParam] ?? errorParam);
    }
    if (msgParam) setMessage(MESSAGE_MAP[msgParam] ?? msgParam);
  }, [searchParams, isClient]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await loginAction(formData);
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      router.replace(result.next || '/profile');
      router.refresh();
    } catch (err) {
      console.error('[auth/login] client action error:', err);
      setError(t('تعذر إتمام تسجيل الدخول. حاول مرة أخرى.', 'Could not sign you in. Please try again.'));
      setLoading(false);
    }
  };

  if (!isClient) return <div className="text-center py-10">{t('جاري التحميل...', 'Loading...')}</div>;

  return (
    <Card dir={isEnglish ? 'ltr' : 'rtl'} className={`mx-auto max-w-md space-y-6 ${isEnglish ? 'text-left' : 'text-right'}`}>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-brand-gold">{t('تسجيل الدخول', 'Sign in')}</h1>
        <p className="text-sm arabic-muted">{t('مرحباً بك في ذِكر - منصتك الروحانية', 'Welcome to Zikr, your spiritual companion')}</p>
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
        <input type="hidden" name="next" value={searchParams.get('next') || '/profile'} />
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">{t('البريد الإلكتروني', 'Email')}</label>
          <input
            id="email"
            name="email"
            dir="ltr"
            type="email"
            required
            disabled={loading}
            placeholder={t('بريدك الإلكتروني', 'Your email')}
            className="w-full rounded-lg border border-brand-gold/20 bg-black/20 p-3 text-brand-cream placeholder:text-brand-cream/40 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">{t('كلمة المرور', 'Password')}</label>
          <input
            id="password"
            name="password"
            dir="ltr"
            type="password"
            required
            disabled={loading}
            placeholder="••••••••"
            className="w-full rounded-lg border border-brand-gold/20 bg-black/20 p-3 text-brand-cream placeholder:text-brand-cream/40 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold disabled:opacity-50"
          />
        </div>

        <div className="text-right">
          <Link href="/auth/forgot" className="text-sm text-brand-gold hover:underline">{t('نسيت كلمة المرور؟', 'Forgot password?')}</Link>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t('جاري الدخول...', 'Signing in...') : t('دخول', 'Sign in')}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-gold/20" /></div>
        <div className="relative flex justify-center text-sm"><span className="bg-brand-emeraldDeep px-4 arabic-muted">{t('أو', 'or')}</span></div>
      </div>

      <GoogleOAuthButton next={searchParams.get('next') || undefined} label={t('المتابعة باستخدام Google', 'Continue with Google')} />

      <p className="text-center text-sm arabic-muted">
        {t('ليس لديك حساب؟', "Don't have an account?")}{' '}
        <Link href="/auth/register" className="text-brand-gold hover:underline">{t('إنشاء حساب جديد', 'Create an account')}</Link>
      </p>
    </Card>
  );
}

export function LoginPage() {
  return (
    <Container className="py-16">
      <Suspense fallback={<div>Loading...</div>}><LoginForm /></Suspense>
    </Container>
  );
}
