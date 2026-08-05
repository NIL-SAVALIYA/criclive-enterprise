import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { startMatchController } from "../controllers/startMatch.controller.js";

const router = express.Router();

router.post(
    "/:matchId/start",
    authenticate,
    startMatchController
);

export default router;