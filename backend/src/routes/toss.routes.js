import express from "express";
import { recordToss } from "../controllers/toss.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createTossSchema } from "../validators/toss.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
    "/:matchId/toss",
    authenticate,
    validate(createTossSchema),
    recordToss
);

export default router;