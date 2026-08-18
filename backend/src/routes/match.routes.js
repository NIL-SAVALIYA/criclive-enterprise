import { Router } from "express";
import {
  create,
  getAll,
  getOne,
  update,
  remove,
  generateScoringToken,
  revokeScoringToken,
  getScoringToken,
  getScoreSessionByToken
} from "../controllers/match.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { Roles } from "../constants/roles.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Match Routes (RBAC Protected)
|--------------------------------------------------------------------------
*/

// Public / Token-verified Guest Score Session Route
router.get(
  "/score-session/:token",
  getScoreSessionByToken
);

// Generate / Regenerate Scoring Token (ADMIN, ORGANIZER, TOURNAMENT_ADMIN)
router.post(
  "/:id/scoring-token/generate",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN),
  generateScoringToken
);

// Revoke Scoring Token (ADMIN, ORGANIZER, TOURNAMENT_ADMIN)
router.post(
  "/:id/scoring-token/revoke",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN),
  revokeScoringToken
);

// Get Active Scoring Token (ADMIN, ORGANIZER, TOURNAMENT_ADMIN)
router.get(
  "/:id/scoring-token",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN),
  getScoringToken
);

// Create Match (ADMIN, ORGANIZER, TOURNAMENT_ADMIN)
router.post(
  "/",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN),
  create
);

// Get All Matches (Public read-only)
router.get(
  "/",
  getAll
);

// Get Match By ID (Authenticated read-only)
router.get(
  "/:id",
  authenticate,
  getOne
);

// Update Match (ADMIN, ORGANIZER, TOURNAMENT_ADMIN, SCORER)
router.put(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN, Roles.SCORER),
  update
);

// Delete Match (ADMIN only)
router.delete(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN),
  remove
);

export default router;