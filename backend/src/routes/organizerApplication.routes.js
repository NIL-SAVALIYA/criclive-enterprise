import { Router } from "express";
import {
  submitApplication,
  getMyApplications,
  getAllApplications,
  getApplicationById,
  reviewApplication,
  suspendOrganizer
} from "../controllers/organizerApplication.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { Roles } from "../constants/roles.js";

const router = Router();

// Submit application / Activate organizer (Any authenticated user)
router.post("/", authenticate, submitApplication);

// Get current user's applications
router.get("/my-application", authenticate, getMyApplications);

// Get all applications (ADMIN only)
router.get("/", authenticate, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), getAllApplications);

// Suspend an organizer (ADMIN only)
router.post("/suspend/:userId", authenticate, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), suspendOrganizer);

// Get application by ID (ADMIN or applicant)
router.get("/:id", authenticate, getApplicationById);

// Review application (ADMIN only)
router.patch("/:id/status", authenticate, authorize(Roles.ADMIN, Roles.SUPER_ADMIN), reviewApplication);

export default router;
