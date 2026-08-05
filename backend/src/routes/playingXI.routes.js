import { Router } from "express";

import {
    createPlayingXIController
} from "../controllers/playingXI.controller.js";

import { validate } from "../middleware/validate.middleware.js";
import { createPlayingXISchema } from "../validators/playingXI.validator.js";

const router = Router();

router.post(
    "/:matchId/playing-xi",
    validate(createPlayingXISchema),
    createPlayingXIController
);

export default router;