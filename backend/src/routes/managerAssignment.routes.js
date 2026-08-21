import { Router } from "express";
import {
  requestAssignment,
  getMatchAssignments,
  acceptAssignment,
  declineAssignment,
  cancelAssignment,
  revokeAssignment
} from "../controllers/managerAssignment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Match-specific assignment request & fetch
router.post("/matches/:matchId/manager-assignments", authenticate, requestAssignment);
router.get("/matches/:matchId/manager-assignments", getMatchAssignments);

// Assignment action endpoints
router.post("/manager-assignments/:id/accept", authenticate, acceptAssignment);
router.post("/manager-assignments/:id/decline", authenticate, declineAssignment);
router.post("/manager-assignments/:id/cancel", authenticate, cancelAssignment);
router.post("/manager-assignments/:id/revoke", authenticate, revokeAssignment);

export default router;
