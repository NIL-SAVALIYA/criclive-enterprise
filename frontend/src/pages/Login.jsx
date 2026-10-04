import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import CaptchaVerification from '../components/CaptchaVerification';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const captchaRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
    }
  }, [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!captchaToken) {
      setError('Please complete the human verification.');
      return;
    }

    setSubmitting(true);

    try {
      const loggedUser = await login(email, password, captchaToken);
      if (loggedUser.role === 'ADMIN' || loggedUser.role === 'SCORER') {
        navigate('/admin/scorer', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      let errMsg = 'Invalid email or password.';
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        errMsg = err.response.data.errors.map(e => e.message).join(' ');
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err.message && !err.response) {
        errMsg = 'Unable to connect to server. Please check your internet connection.';
      }
      setError(errMsg);

      // Reset single-use CAPTCHA token on login failure
      setCaptchaToken(null);
      captchaRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  const isFormValid = Boolean(
    email.trim() &&
    password &&
    captchaToken &&
    !captchaLoading &&
    !submitting
  );

  return (
    <div className="flex items-center justify-center min-h-[75vh] px-4">
      <div className="glass-panel p-8 rounded-2xl border border-gray-800 w-full max-w-md space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-lg glow-emerald">
            ⚡
          </div>
          <h1 className="text-2xl font-extrabold text-white">Sign In to CricLive</h1>
          <p className="text-xs text-gray-400">Enter your credentials to access scorer console & admin panel</p>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            {successMsg}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs font-bold text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="user@criclive.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Cloudflare Turnstile Human Verification */}
          <div className="pt-1.5 pb-1">
            <CaptchaVerification
              ref={captchaRef}
              onVerify={(token) => {
                setCaptchaToken(token);
                setError(null);
              }}
              onExpire={() => {
                setCaptchaToken(null);
              }}
              onError={(err) => {
                setCaptchaToken(null);
                setError(err);
              }}
              onLoading={(loading) => {
                setCaptchaLoading(loading);
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all flex justify-center items-center gap-2 mt-2 ${
              isFormValid
                ? 'bg-emerald-600 hover:bg-emerald-500 glow-emerald text-white cursor-pointer'
                : 'bg-gray-800 border border-gray-700/60 text-gray-500 cursor-not-allowed opacity-70'
            }`}
          >
            <LogIn className="w-4 h-4" /> {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-800/80">
          <p className="text-xs text-gray-400">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline ml-1"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
