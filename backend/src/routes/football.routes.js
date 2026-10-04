import { Router } from "express";
import {
  startMatch,
  getMatchState,
  getEvents,
  recordGoal,
  recordCard,
  recordSubstitution,
  recordPenalty,
  recordKickoff,
  recordHalfTime,
  startSecondHalf,
  recordFullTime,
  undoEvent
} from "../controllers/football.controller.js";
import { getScoreSessionByToken } from "../controllers/match.controller.js";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";
import { requireSport } from "../middleware/sportGuard.middleware.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Football Scoring API Routes
|--------------------------------------------------------------------------
*/

// Guest Score Session Validation Route aliases under football namespace
router.get("/score-session/:token", getScoreSessionByToken);
router.get("/matches/score-session/:token", getScoreSessionByToken);

// GET /api/v1/football/matches/:matchId/state - Public view of Football match state & timeline
router.get("/matches/:matchId/state", requireSport("FOOTBALL"), getMatchState);

// GET /api/v1/football/matches/:matchId/events - Public view of Football event timeline
router.get("/matches/:matchId/events", requireSport("FOOTBALL"), getEvents);

// POST /api/v1/football/matches/:matchId/start - Start/initialize Football match
router.post(
  "/matches/:matchId/start",
  authorizeScorer,
  requireSport("FOOTBALL"),
  startMatch
);

// POST /api/v1/football/matches/:matchId/events/goal - Record a Goal
router.post(
  "/matches/:matchId/events/goal",
  authorizeScorer,
  requireSport("FOOTBALL"),
  recordGoal
);

// POST /api/v1/football/matches/:matchId/events/card - Record Yellow/Red Card
router.post(
  "/matches/:matchId/events/card",
  authorizeScorer,
  requireSport("FOOTBALL"),
  recordCard
);

// POST /api/v1/football/matches/:matchId/events/substitution - Record Player Substitution
router.post(
  "/matches/:matchId/events/substitution",
  authorizeScorer,
  requireSport("FOOTBALL"),
  recordSubstitution
);

// POST /api/v1/football/matches/:matchId/events/penalty - Record Penalty event
router.post(
  "/matches/:matchId/events/penalty",
  authorizeScorer,
  requireSport("FOOTBALL"),
  recordPenalty
);

// POST /api/v1/football/matches/:matchId/events/kickoff - Record Kickoff event
router.post(
  "/matches/:matchId/events/kickoff",
  authorizeScorer,
  requireSport("FOOTBALL"),
  recordKickoff
);

// POST /api/v1/football/matches/:matchId/half-time - Half-time whistle
router.post(
  "/matches/:matchId/half-time",
  authorizeScorer,
  requireSport("FOOTBALL"),
  recordHalfTime
);

// POST /api/v1/football/matches/:matchId/second-half - Start second half
router.post(
  "/matches/:matchId/second-half",
  authorizeScorer,
  requireSport("FOOTBALL"),
  startSecondHalf
);

// POST /api/v1/football/matches/:matchId/full-time - Full-time whistle & complete match
router.post(
  "/matches/:matchId/full-time",
  authorizeScorer,
  requireSport("FOOTBALL"),
  recordFullTime
);

// POST /api/v1/football/matches/:matchId/undo-event - Undo latest football event
router.post(
  "/matches/:matchId/undo-event",
  authorizeScorer,
  requireSport("FOOTBALL"),
  undoEvent
);

// Alias: POST /api/v1/football/matches/:matchId/undo
router.post(
  "/matches/:matchId/undo",
  authorizeScorer,
  requireSport("FOOTBALL"),
  undoEvent
);

export default router;
