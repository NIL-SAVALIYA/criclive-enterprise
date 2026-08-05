import { Router } from "express";
import { getLiveMatch,getScorecard } from "../controllers/liveMatch.controller.js";

const router = Router();

router.get("/:matchId/live", getLiveMatch);
router.get("/:matchId/scorecard", getScorecard);

export default router;