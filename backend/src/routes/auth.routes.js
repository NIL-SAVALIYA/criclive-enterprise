import { Router } from "express";
import { register, login, profile } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authRateLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);


     

// new import add for authenticate user by getProfile by Id  profile added in :-
// import { register, login, profile } from "../controllers/auth.controller.js":


router.get("/profile", authenticate, profile);

export default router; 