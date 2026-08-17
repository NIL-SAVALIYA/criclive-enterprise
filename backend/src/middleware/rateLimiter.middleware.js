import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  skip: (req) => process.env.NODE_ENV === "test" || req.ip === "127.0.0.1" || req.ip === "::1",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes."
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  skip: (req) => process.env.NODE_ENV === "test" || req.ip === "127.0.0.1" || req.ip === "::1",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many failed login attempts. Please try again after 15 minutes for security reasons."
  }
});
