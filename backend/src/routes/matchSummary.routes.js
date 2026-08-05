import { Router } from "express";
import { getMatchSummary } from "../controllers/matchSummary.controller.js";

const router = Router();

router.get("/:matchId/summary", getMatchSummary);

export default router;