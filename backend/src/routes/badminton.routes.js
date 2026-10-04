import { Router } from "express";
import {
  getMatchState,
  recordPoint,
  undoPoint
} from "../controllers/badminton.controller.js";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";
import { requireSport } from "../middleware/sportGuard.middleware.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Badminton Scoring API Routes
|--------------------------------------------------------------------------
*/

// GET /api/v1/badminton/matches/:matchId/state - Public view of Badminton match state & point history
router.get("/matches/:matchId/state", requireSport("BADMINTON"), getMatchState);

// POST /api/v1/badminton/matches/:matchId/points - Record a Badminton rally point (Scorer/Admin/Organizer/Token)
router.post(
  "/matches/:matchId/points",
  authorizeScorer,
  requireSport("BADMINTON"),
  recordPoint
);

// POST /api/v1/badminton/matches/:matchId/undo - Undo last Badminton rally point (Scorer/Admin/Organizer/Token)
router.post(
  "/matches/:matchId/undo",
  authorizeScorer,
  requireSport("BADMINTON"),
  undoPoint
);

export default router;

