import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Monitor, Shield, BarChart3, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, tokens } = res.data.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Monitor, title: 'Asset Management', desc: 'Track all IT assets with complete history' },
    { icon: Shield, title: 'Incident Management', desc: 'Create and resolve IT tickets efficiently' },
    { icon: BarChart3, title: 'KPI Dashboard', desc: 'Real-time infrastructure performance metrics' },
    { icon: Bell, title: 'Smart Alerts', desc: 'AMC, warranty, and payment reminders' },
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-body)' }}
    >
      {/* Left Panel — Branding */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-[45%]"
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f1d40 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-20 -left-20 rounded-full opacity-5"
          style={{ width: 400, height: 400, background: '#3742FA' }}
        />
        <div
          className="absolute bottom-0 right-0 rounded-full opacity-5"
          style={{ width: 300, height: 300, background: '#8b5cf6', transform: 'translate(30%, 30%)' }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 48, height: 48,
                background: 'linear-gradient(135deg, #3742FA, #5b63fb)',
                boxShadow: '0 8px 24px rgba(55,66,250,0.4)',
              }}
            >
              <Monitor size={24} color="white" />
            </div>
            <div>
              <div className="text-white font-bold text-xl">IT Operations</div>
              <div className="text-slate-400 text-sm">Manager Platform</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Centralize Your<br />
            <span style={{ color: '#6473fb' }}>IT Infrastructure</span><br />
            Operations
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            One unified platform to manage assets, incidents, vendors, AMC contracts,
            network uptime, and daily IT activities — designed for enterprise IT teams.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="flex items-center justify-center rounded-lg mb-3"
                style={{ width: 34, height: 34, background: 'rgba(55,66,250,0.2)' }}
              >
                <f.icon size={17} style={{ color: '#6473fb' }} />
              </div>
              <div className="text-white font-semibold text-sm">{f.title}</div>
              <div className="text-slate-500 text-xs mt-1">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10 text-slate-600 text-xs">
          © 2026 IT Operations Manager • Enterprise Edition
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #3742FA, #5b63fb)' }}
            >
              <Monitor size={20} color="white" />
            </div>
            <div>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>IT Operations Manager</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Welcome back
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to your IT Operations Manager account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
                style={{ background: 'var(--kpi-red)', color: '#991b1b' }}
              >
                <Shield size={14} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary w-full justify-center"
              style={{ padding: '11px 16px', fontSize: 14 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Demo credentials hint */}
            <div
              className="text-xs text-center p-3 rounded-lg"
              style={{ background: 'var(--bg-body)', color: 'var(--text-muted)' }}
            >
              Demo: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>admin@company.com</span>
              {' / '}
              <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>Admin@1234</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
