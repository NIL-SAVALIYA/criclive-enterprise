import { Router } from "express";

import {
    createPlayingXIController,
    getPlayingXIController,
    updatePlayingXIController
} from "../controllers/playingXI.controller.js";

import { validate } from "../middleware/validate.middleware.js";
import { createPlayingXISchema } from "../validators/playingXI.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
    "/:matchId/playing-xi",
    getPlayingXIController
);

router.post(
    "/:matchId/playing-xi",
    authenticate,
    validate(createPlayingXISchema),
    createPlayingXIController
);

router.put(
    "/:matchId/playing-xi",
    authenticate,
    validate(createPlayingXISchema),
    updatePlayingXIController
);

export default router;