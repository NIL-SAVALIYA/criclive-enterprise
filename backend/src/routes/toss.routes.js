import express from "express";
import { recordToss } from "../controllers/toss.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createTossSchema } from "../validators/toss.validator.js";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";

const router = express.Router();

router.post(
    "/:matchId/toss",
    authorizeScorer,
    validate(createTossSchema),
    recordToss
);

export default router;