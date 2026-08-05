import { Router } from "express";
import {
  getMatchAnalytics,
  getPartnershipTimeline,
  getFallOfWicketsTimeline
} from "../controllers/analytics.controller.js";

const router = Router();

router.get("/:matchId/analytics", getMatchAnalytics);
router.get("/innings/:inningsId/partnerships", getPartnershipTimeline);
router.get("/innings/:inningsId/fall-of-wickets", getFallOfWicketsTimeline);

export default router;
