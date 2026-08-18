import express from "express";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";
import { endInningsController } from "../controllers/endInnings.controller.js";

const router = express.Router();

router.post(
    "/:inningsId/end",
    authorizeScorer,
    endInningsController
);

export default router;