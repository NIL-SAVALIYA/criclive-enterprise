import { Router } from "express";
import {
  getCapsAndLeaders,
  getMVPLeaderboard,
  getHeadToHead,
  getTeamRecentForm
} from "../controllers/records.controller.js";

const router = Router();

router.get("/caps-and-leaders", getCapsAndLeaders);
router.get("/mvp-leaderboard", getMVPLeaderboard);
router.get("/head-to-head/:teamAId/:teamBId", getHeadToHead);
router.get("/team-form/:teamId", getTeamRecentForm);

export default router;
