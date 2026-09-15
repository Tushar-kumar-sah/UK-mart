'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Lock, User, Mail, ArrowLeft, ArrowRight,
  Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Login Form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up Form
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');

  const authError = searchParams.get('error');

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  // Alert user of any OAuth errors
  useEffect(() => {
    if (authError) {
      if (authError === 'OAuthCallback' || authError === 'OAuthSignin') {
        toast.error('Google Sign-In failed. Check Google Cloud Console redirect URIs.');
      } else if (authError === 'Configuration') {
        toast.error('OAuth Configuration error. Check Google credentials.');
      } else if (authError === 'AccessDenied') {
        toast.error('Access was denied by Google.');
      }
    }
  }, [authError]);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } catch (err) {
      console.error('Google sign in error:', err);
      toast.error('Failed to initiate Google sign in');
      setGoogleLoading(false);
    }
  };

  // Handle Phone Login
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = loginPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!loginPassword) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn('phone-login', {
        phone: cleanPhone,
        password: loginPassword,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Welcome back!');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error('Phone login error:', err);
      toast.error('An unexpected error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // Handle Phone Sign Up
  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || signupName.trim().length < 2) {
      toast.error('Please enter your full name');
      return;
    }

    const cleanPhone = signupPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    if (!signupPassword || signupPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          phone: cleanPhone,
          password: signupPassword,
          email: signupEmail.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      toast.success('Account created successfully! Logging you in...');

      // Auto login after sign up
      const loginRes = await signIn('phone-login', {
        phone: cleanPhone,
        password: signupPassword,
        redirect: false,
        callbackUrl,
      });

      if (loginRes?.error) {
        toast.error('Account created! Please log in with your password.');
        setActiveTab('login');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error('Sign up error:', err);
      toast.error('An unexpected network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50/40 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow orbs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-green-400/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-amber-400/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top back navigation */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-green-700 transition-colors gap-1.5 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200/60 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to store
        </Link>
      </div>

      {/* Card Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block relative h-16 w-16 mb-2">
            <Image
              src="/logo.png"
              alt="UK MART"
              fill
              className="object-contain drop-shadow-md"
              priority
              unoptimized
            />
          </Link>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {activeTab === 'login' ? 'Welcome to UK MART' : 'Create Your Account'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            {activeTab === 'login'
              ? 'Sign in to access your cart, addresses, and order history'
              : 'Join thousands of happy customers getting fresh groceries delivered'}
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-5 sm:px-8 shadow-2xl shadow-green-950/[0.06] rounded-3xl border border-gray-100">
          {/* Tab Switcher */}
          <div className="flex bg-gray-100/80 p-1 rounded-2xl mb-6 border border-gray-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-white text-gray-900 shadow-md shadow-black/[0.04]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                activeTab === 'signup'
                  ? 'bg-white text-gray-900 shadow-md shadow-black/[0.04]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-5 p-3.5 bg-red-50/90 border border-red-200/80 rounded-2xl text-xs text-red-800 flex items-start gap-2.5 shadow-xs">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <p className="font-bold text-red-900 mb-0.5">Google Sign-In Issue</p>
                <p className="text-[11px] text-red-700 leading-relaxed">
                  {authError === 'OAuthCallback' || authError === 'OAuthSignin'
                    ? 'Google could not complete the sign-in. Please ensure "http://localhost:3000/api/auth/callback/google" is added to Authorized Redirect URIs in your Google Cloud Console.'
                    : authError === 'Configuration'
                    ? 'OAuth credentials error. Please verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
                    : authError === 'AccessDenied'
                    ? 'Access was denied by Google.'
                    : `Error: ${authError}`}
                </p>
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full h-11 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-green-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-semibold tracking-wider">
                Or with mobile number
              </span>
            </div>
          </div>

          {/* Tab Forms */}
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
                onSubmit={handlePhoneLogin}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1.5">
                    Phone Number
                  </Label>
                  <div className="relative flex rounded-xl border border-gray-200 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100 bg-gray-50/50 transition-all">
                    <span className="inline-flex items-center px-3 text-xs font-bold text-gray-500 border-r border-gray-200">
                      🇮🇳 +91
                    </span>
                    <Input
                      type="tel"
                      maxLength={10}
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 10-digit number"
                      className="border-0 bg-transparent focus-visible:ring-0 focus-visible:border-0 h-11 text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-bold text-gray-700">Password</Label>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-11 pr-10 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-green-500 focus:ring-green-100 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-green-500/25 transition-all border-0 mt-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing In...</>
                  ) : (
                    <>Sign In <ArrowRight className="w-4 h-4 ml-1.5" /></>
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                onSubmit={handlePhoneSignUp}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1.5">
                    Full Name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g., Rahul Sharma"
                      className="pl-10 h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-green-500 focus:ring-green-100 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1.5">
                    Mobile Number *
                  </Label>
                  <div className="relative flex rounded-xl border border-gray-200 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100 bg-gray-50/50 transition-all">
                    <span className="inline-flex items-center px-3 text-xs font-bold text-gray-500 border-r border-gray-200">
                      🇮🇳 +91
                    </span>
                    <Input
                      type="tel"
                      maxLength={10}
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile number"
                      className="border-0 bg-transparent focus-visible:ring-0 focus-visible:border-0 h-11 text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1.5">
                    Create Password * (min 6 chars)
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create a password"
                      className="h-11 pr-10 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-green-500 focus:ring-green-100 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-gray-700 block mb-1.5">
                    Email Address <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="pl-10 h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-green-500 focus:ring-green-100 text-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-green-500/25 transition-all border-0 mt-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Account...</>
                  ) : (
                    <>Create Account <CheckCircle2 className="w-4 h-4 ml-1.5" /></>
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer Security Badges */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              <span>100% Secure</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Setup</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
