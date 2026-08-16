import { Router } from "express";

import {
    createPlayingXIController,
    getPlayingXIController,
    updatePlayingXIController
} from "../controllers/playingXI.controller.js";

import { validate } from "../middleware/validate.middleware.js";
import { createPlayingXISchema } from "../validators/playingXI.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { Roles } from "../constants/roles.js";

const router = Router();

router.get(
    "/:matchId/playing-xi",
    getPlayingXIController
);

router.post(
    "/:matchId/playing-xi",
    authenticate,
    authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN, Roles.SCORER),
    validate(createPlayingXISchema),
    createPlayingXIController
);

router.put(
    "/:matchId/playing-xi",
    authenticate,
    authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN, Roles.SCORER),
    validate(createPlayingXISchema),
    updatePlayingXIController
);

export default router;