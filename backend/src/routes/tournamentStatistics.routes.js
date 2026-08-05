import { Router } from "express";

import {getTournamentStatisticsController} from "../controllers/tournamentStatistics.controller.js";

const router = Router();

router.get("/:tournamentId/statistics", getTournamentStatisticsController );

export default router;