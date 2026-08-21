import env from "../config/env.js";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFICATION_TIMEOUT_MS = 7000;

/**
 * Verify Cloudflare Turnstile CAPTCHA token with Cloudflare API
 * @param {string} token - The client-provided Turnstile response token
 * @param {string} [clientIp] - Client IP address for additional verification context
 * @returns {Promise<{ success: boolean, code?: string, message?: string, challengeTs?: string, hostname?: string }>}
 */
export async function verifyCaptchaToken(token, clientIp = null) {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return {
      success: false,
      code: "CAPTCHA_MISSING",
      message: "Please complete the human verification."
    };
  }

  const trimmedToken = token.trim();

  // Explicit test tokens for automated test suites
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    if (trimmedToken === "test-invalid-token") {
      return {
        success: false,
        code: "CAPTCHA_INVALID",
        message: "Human verification failed. Please try again."
      };
    }
    if (trimmedToken === "test-expired-token") {
      return {
        success: false,
        code: "CAPTCHA_EXPIRED",
        message: "Human verification expired. Please try again."
      };
    }
    if (trimmedToken === "test-valid-token") {
      return {
        success: true,
        challengeTs: new Date().toISOString(),
        hostname: "localhost"
      };
    }
  }

  const secretKey = env.CAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error("❌ CAPTCHA configuration error: CAPTCHA_SECRET_KEY is not configured.");
    return {
      success: false,
      code: "CAPTCHA_CONFIG_ERROR",
      message: "Unable to verify right now. Please try again."
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VERIFICATION_TIMEOUT_MS);

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", trimmedToken);
    if (clientIp && typeof clientIp === "string") {
      formData.append("remoteip", clientIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`⚠️ Cloudflare Turnstile API returned HTTP status ${response.status}`);
      return {
        success: false,
        code: "CAPTCHA_PROVIDER_ERROR",
        message: "Unable to verify right now. Please try again."
      };
    }

    const result = await response.json();

    if (result.success === true) {
      return {
        success: true,
        challengeTs: result.challenge_ts,
        hostname: result.hostname
      };
    }

    const errorCodes = Array.isArray(result["error-codes"]) ? result["error-codes"] : [];

    if (errorCodes.includes("timeout-or-duplicate")) {
      return {
        success: false,
        code: "CAPTCHA_EXPIRED",
        message: "Human verification expired. Please try again."
      };
    }

    if (errorCodes.includes("missing-input-response")) {
      return {
        success: false,
        code: "CAPTCHA_MISSING",
        message: "Please complete the human verification."
      };
    }

    if (errorCodes.includes("invalid-input-response")) {
      return {
        success: false,
        code: "CAPTCHA_INVALID",
        message: "Human verification failed. Please try again."
      };
    }

    return {
      success: false,
      code: "CAPTCHA_FAILED",
      message: "Human verification failed. Please try again."
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.error("⚠️ Cloudflare Turnstile verification timed out.");
    } else {
      console.error("⚠️ Cloudflare Turnstile network error:", err.message);
    }

    return {
      success: false,
      code: "CAPTCHA_NETWORK_ERROR",
      message: "Unable to verify right now. Please try again."
    };
  }
}
