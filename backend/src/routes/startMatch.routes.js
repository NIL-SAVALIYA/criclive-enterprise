import express from "express";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { startMatchController } from "../controllers/startMatch.controller.js";
import { startMatchSchema } from "../validators/startMatch.validators.js";

const router = express.Router();

router.post(
    "/:matchId/start",
    authorizeScorer,
    validate(startMatchSchema),
    startMatchController
);

export default router;