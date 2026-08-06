import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { startMatchController } from "../controllers/startMatch.controller.js";
import { startMatchSchema } from "../validators/startMatch.validators.js";

const router = express.Router();

router.post(
    "/:matchId/start",
    authenticate,
    validate(startMatchSchema),
    startMatchController
);

export default router;