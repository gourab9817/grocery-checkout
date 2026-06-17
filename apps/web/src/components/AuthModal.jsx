import { useState } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { useUser } from '../lib/userContext.jsx';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, signup, handleAuthSuccess } = useUser();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!showAuthModal) return null;

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value }),
    ),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await signup({ email: form.email, password: form.password, name: form.name || undefined });
      }
      handleAuthSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => e.target === e.currentTarget && setShowAuthModal(false)}
    >
      <div className="bg-canvas rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-[fadeInUp_0.2s_ease]">
        <button
          onClick={() => setShowAuthModal(false)}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-parchment transition-colors"
        >
          <X size={16} strokeWidth={1.5} />
        </button>

        <div className="mb-7">
          <h2 className="font-serif font-bold text-2xl text-forest">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-forest/50 mt-1">
            {mode === 'login'
              ? 'Sign in to track your orders and save time at checkout.'
              : 'Join to keep track of your orders.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-forest/60 uppercase tracking-wide">Name (optional)</span>
              <div className="relative">
                <User size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest/40" />
                <input
                  type="text"
                  placeholder="Your name"
                  autoComplete="name"
                  className="input pl-9 w-full"
                  {...field('name')}
                />
              </div>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-forest/60 uppercase tracking-wide">Email</span>
            <div className="relative">
              <Mail size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest/40" />
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="input pl-9 w-full"
                {...field('email')}
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-forest/60 uppercase tracking-wide">Password</span>
            <div className="relative">
              <Lock size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest/40" />
              <input
                type="password"
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                className="input pl-9 w-full"
                {...field('password')}
              />
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-terra/10 border border-terra/20 text-terra text-xs">
              <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary justify-center py-3.5 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={15} className="animate-spin" strokeWidth={1.5} />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-forest/50 mt-5">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="text-forest font-semibold hover:underline"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
