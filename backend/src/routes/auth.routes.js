import { Router } from "express";
import { register, login, profile, updateProfile } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authRateLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.get("/profile", authenticate, profile);
router.patch("/profile", authenticate, updateProfile);

export default router; 