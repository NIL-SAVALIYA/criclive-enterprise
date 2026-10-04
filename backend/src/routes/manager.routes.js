import { Router } from "express";
import {
  registerManager,
  getMyProfile,
  updateMyProfile,
  toggleActive,
  checkNickname,
  searchManagers,
  getPublicProfile,
  getMyFixtures
} from "../controllers/manager.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Public / Lightweight Checks
router.get("/check-nickname", checkNickname);
router.get("/search", authenticate, searchManagers);

// Authenticated Manager Profile Routes
router.post("/register", authenticate, registerManager);
router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, updateMyProfile);
router.post("/me/toggle-active", authenticate, toggleActive);
router.get("/me/fixtures", authenticate, getMyFixtures);

// Public profile view
router.get("/:identifier", getPublicProfile);

export default router;
