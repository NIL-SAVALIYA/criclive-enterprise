import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const CaptchaVerification = forwardRef(function CaptchaVerification(
  {
    onVerify,
    onError,
    onExpire,
    onLoading,
    className = ''
  },
  ref
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const isMountedRef = useRef(true);

  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'verified' | 'expired' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);

  const siteKey = import.meta.env.VITE_CAPTCHA_SITE_KEY || '1x00000000000000000000AA';

  const reset = () => {
    if (window.turnstile && widgetIdRef.current !== null) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (e) {
        console.warn('Turnstile reset error:', e);
      }
    }
    setStatus('ready');
    setErrorMessage(null);
  };

  const getResponse = () => {
    if (window.turnstile && widgetIdRef.current !== null) {
      try {
        return window.turnstile.getResponse(widgetIdRef.current);
      } catch (e) {
        console.warn('Turnstile getResponse error:', e);
      }
    }
    return null;
  };

  useImperativeHandle(ref, () => ({
    reset,
    getResponse
  }));

  useEffect(() => {
    onLoading && onLoading(status === 'loading');
  }, [status, onLoading]);

  useEffect(() => {
    isMountedRef.current = true;

    const renderWidget = () => {
      if (!isMountedRef.current || !containerRef.current || !window.turnstile) return;

      // Avoid duplicate rendering into the same container
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // ignore cleanup error
        }
        widgetIdRef.current = null;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'dark',
          size: 'normal',
          callback: (token) => {
            if (!isMountedRef.current) return;
            setStatus('verified');
            setErrorMessage(null);
            onVerify && onVerify(token);
          },
          'error-callback': (code) => {
            if (!isMountedRef.current) return;
            setStatus('error');
            const msg = 'Human verification failed. Please try again.';
            setErrorMessage(msg);
            onError && onError(msg);
          },
          'expired-callback': () => {
            if (!isMountedRef.current) return;
            setStatus('expired');
            const msg = 'Verification expired. Please verify again.';
            setErrorMessage(msg);
            onExpire && onExpire();
          }
        });

        widgetIdRef.current = id;
        setStatus('ready');
      } catch (err) {
        console.error('Failed to render Turnstile widget:', err);
        if (isMountedRef.current) {
          setStatus('error');
          setErrorMessage('Unable to load verification widget.');
          onError && onError('Unable to load verification widget.');
        }
      }
    };

    const loadScriptAndRender = () => {
      if (window.turnstile) {
        renderWidget();
        return;
      }

      let script = document.getElementById(TURNSTILE_SCRIPT_ID);
      if (!script) {
        script = document.createElement('script');
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderWidget();
        }
      }, 100);

      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.turnstile && isMountedRef.current) {
          setStatus('error');
          setErrorMessage('Unable to load verification right now.');
          onError && onError('Unable to load verification right now.');
        }
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
      };
    };

    const cleanup = loadScriptAndRender();

    return () => {
      isMountedRef.current = false;
      if (cleanup) cleanup();
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return (
    <div
      role="region"
      aria-label="Human verification challenge"
      aria-live="polite"
      className={`rounded-xl border border-gray-800/90 bg-gray-900/60 p-3 shadow-inner transition-all ${
        status === 'verified'
          ? 'border-emerald-500/40 bg-emerald-950/20'
          : status === 'error' || status === 'expired'
          ? 'border-red-500/40 bg-red-950/20'
          : 'border-gray-800'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
          <ShieldCheck
            className={`w-3.5 h-3.5 ${
              status === 'verified' ? 'text-emerald-400' : 'text-gray-400'
            }`}
          />
          <span>Human Verification</span>
        </div>
        <span className="text-[10px] text-gray-500 font-medium tracking-wide">
          Cloudflare Turnstile
        </span>
      </div>

      <div className="flex justify-center items-center min-h-[65px] w-full overflow-hidden rounded-lg">
        {status === 'loading' && (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-4 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            <span>Loading verification...</span>
          </div>
        )}
        <div
          ref={containerRef}
          className={`flex justify-center max-w-full ${status === 'loading' ? 'hidden' : 'block'}`}
        />
      </div>

      {status === 'verified' && (
        <div className="mt-2 pt-1.5 border-t border-emerald-500/20 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Human verification successful</span>
        </div>
      )}

      {(status === 'error' || status === 'expired') && errorMessage && (
        <div className="mt-2 pt-1.5 border-t border-red-500/20 flex items-center justify-between text-[11px] font-semibold text-red-400">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-[10px] font-bold text-gray-400 hover:text-white underline ml-2 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
});

export default CaptchaVerification;
