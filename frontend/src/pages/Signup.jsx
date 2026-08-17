import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, UserPlus, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required.';
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters.';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required.';
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else {
      if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      } else if (!/[A-Z]/.test(formData.password)) {
        errors.password = 'Password must contain at least one uppercase letter.';
      } else if (!/[a-z]/.test(formData.password)) {
        errors.password = 'Password must contain at least one lowercase letter.';
      } else if (!/[0-9]/.test(formData.password)) {
        errors.password = 'Password must contain at least one number.';
      } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
        errors.password = 'Password must contain at least one special character.';
      }
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.';
    } else if (formData.confirmPassword !== formData.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setGeneralError(null);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    setGeneralError(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      });

      setRegistered(true);

      // Redirect to login after brief confirmation with email prefilled
      setTimeout(() => {
        navigate('/login', {
          state: {
            email: formData.email.trim().toLowerCase(),
            message: 'Account created successfully! Please sign in with your password.'
          },
          replace: true
        });
      }, 1200);
    } catch (err) {
      console.error('Registration error:', err);
      let errMsg = 'Failed to register account. Please try again.';

      if (err.response?.status === 409) {
        errMsg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        // Map backend validation errors to fields
        const backendFieldErrors = {};
        err.response.data.errors.forEach((issue) => {
          if (issue.field) {
            backendFieldErrors[issue.field] = issue.message;
          }
        });
        if (Object.keys(backendFieldErrors).length > 0) {
          setFieldErrors(backendFieldErrors);
        }
        errMsg = err.response.data.errors.map((e) => e.message).join(' ');
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err.message && !err.response) {
        errMsg = 'Unable to connect to the authentication server. Please check your network connection.';
      }

      setGeneralError(errMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4 py-8">
      <div className="glass-panel p-8 rounded-2xl border border-gray-800 w-full max-w-lg space-y-6 shadow-2xl">
        {/* Header Banner */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-lg glow-emerald">
            ⚡
          </div>
          <h1 className="text-2xl font-extrabold text-white">Create CricLive Account</h1>
          <p className="text-xs text-gray-400">Join the CricLive Enterprise platform to follow live scores & match updates</p>
        </div>

        {/* Success Alert */}
        {registered && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            Account created successfully! Redirecting to Sign In...
          </div>
        )}

        {/* General Error Alert */}
        {generalError && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs font-bold text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {generalError}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                First Name <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  name="firstName"
                  required
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full bg-gray-900 border ${
                    fieldErrors.firstName ? 'border-red-500' : 'border-gray-700'
                  } text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none`}
                />
              </div>
              {fieldErrors.firstName && (
                <p className="text-[10px] text-red-400 font-semibold mt-1">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Last Name <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  name="lastName"
                  required
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full bg-gray-900 border ${
                    fieldErrors.lastName ? 'border-red-500' : 'border-gray-700'
                  } text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none`}
                />
              </div>
              {fieldErrors.lastName && (
                <p className="text-[10px] text-red-400 font-semibold mt-1">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Email Address <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="email"
                name="email"
                required
                placeholder="john.doe@criclive.com"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-gray-900 border ${
                  fieldErrors.email ? 'border-red-500' : 'border-gray-700'
                } text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-[10px] text-red-400 font-semibold mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Password <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className={`w-full bg-gray-900 border ${
                  fieldErrors.password ? 'border-red-500' : 'border-gray-700'
                } text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none`}
              />
            </div>
            {fieldErrors.password ? (
              <p className="text-[10px] text-red-400 font-semibold mt-1">{fieldErrors.password}</p>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1">
                At least 8 chars with uppercase, lowercase, number & special character
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Confirm Password <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="password"
                name="confirmPassword"
                required
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full bg-gray-900 border ${
                  fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-700'
                } text-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none`}
              />
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-[10px] text-red-400 font-semibold mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || registered}
            className={`w-full py-3.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all flex justify-center items-center gap-2 mt-2 ${
              submitting || registered
                ? 'bg-gray-700 cursor-not-allowed opacity-75'
                : 'bg-emerald-600 hover:bg-emerald-500 glow-emerald'
            }`}
          >
            <UserPlus className="w-4 h-4" /> {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Link back to Login */}
        <div className="text-center pt-2 border-t border-gray-800/80">
          <p className="text-xs text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline ml-1"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
