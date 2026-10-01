import express from "express";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";
import { endInningsController } from "../controllers/endInnings.controller.js";
import { requireSport } from "../middleware/sportGuard.middleware.js";

const router = express.Router();

router.post(
    "/:inningsId/end",
    authorizeScorer,
    requireSport("CRICKET"),
    endInningsController
);

export default router;