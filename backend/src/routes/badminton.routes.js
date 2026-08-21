import { Router } from "express";
import {
  getMatchState,
  recordPoint,
  undoPoint
} from "../controllers/badminton.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { Roles } from "../constants/roles.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Badminton Scoring API Routes
|--------------------------------------------------------------------------
*/

// GET /api/v1/badminton/matches/:matchId/state - Public view of Badminton match state & point history
router.get("/matches/:matchId/state", getMatchState);

// POST /api/v1/badminton/matches/:matchId/points - Record a Badminton rally point (Scorer/Admin/Organizer)
router.post(
  "/matches/:matchId/points",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.SCORER, Roles.TOURNAMENT_ADMIN),
  recordPoint
);

// POST /api/v1/badminton/matches/:matchId/undo - Undo last Badminton rally point (Scorer/Admin/Organizer)
router.post(
  "/matches/:matchId/undo",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.SCORER, Roles.TOURNAMENT_ADMIN),
  undoPoint
);

export default router;
