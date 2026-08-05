import { Router } from "express";

import { getPlayerStatisticsController, getPlayerCareerRecordsController }  from "../controllers/playerStatistics.controller.js";

const router = Router();

router.get( "/:playerId/statistics", getPlayerStatisticsController);
router.get( "/:playerId/career-records", getPlayerCareerRecordsController);

export default router;