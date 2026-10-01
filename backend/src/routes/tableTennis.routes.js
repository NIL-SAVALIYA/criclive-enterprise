import { Router } from "express";
import {
  startMatch,
  getMatchState,
  recordPoint,
  undoPoint,
  getScorecard
} from "../controllers/tableTennis.controller.js";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";
import { requireSport } from "../middleware/sportGuard.middleware.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Table Tennis Scoring API Routes
|--------------------------------------------------------------------------
*/

// GET /api/v1/table-tennis/matches/:matchId/state
// GET /api/v1/table-tennis/matches/:matchId (Alias)
router.get("/matches/:matchId/state", requireSport("TABLE_TENNIS"), getMatchState);
router.get("/matches/:matchId", requireSport("TABLE_TENNIS"), getMatchState);

// GET /api/v1/table-tennis/matches/:matchId/scorecard
router.get("/matches/:matchId/scorecard", requireSport("TABLE_TENNIS"), getScorecard);

// POST /api/v1/table-tennis/matches/:matchId/start
router.post(
  "/matches/:matchId/start",
  authorizeScorer,
  requireSport("TABLE_TENNIS"),
  startMatch
);

// POST /api/v1/table-tennis/matches/:matchId/point
router.post(
  "/matches/:matchId/point",
  authorizeScorer,
  requireSport("TABLE_TENNIS"),
  recordPoint
);

// POST /api/v1/table-tennis/matches/:matchId/undo
router.post(
  "/matches/:matchId/undo",
  authorizeScorer,
  requireSport("TABLE_TENNIS"),
  undoPoint
);

export default router;
