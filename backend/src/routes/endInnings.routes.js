import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { endInningsController } from "../controllers/endInnings.controller.js";

const router = express.Router();

router.post(
    "/:inningsId/end",
    authenticate,
    endInningsController
);

export default router;