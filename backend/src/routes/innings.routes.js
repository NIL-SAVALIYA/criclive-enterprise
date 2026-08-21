import { Router } from "express";

import {
    create,
    getAll,
    getOne,
    update,
    remove,
    getEligibleBatters
} from "../controllers/innings.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";
import { undoLastBall } from "../controllers/undoBall.controller.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Innings Routes
|--------------------------------------------------------------------------
*/

// Get Eligible Incoming Batters
router.get(
    "/:id/eligible-batters",
    getEligibleBatters
);

router.get(
    "/:inningsId/eligible-batters",
    getEligibleBatters
);

// Create Innings
router.post(
    "/",
    authenticate,
    authorize("ADMIN", "ORGANIZER"),
    create
);

// Get All Innings
router.get(
    "/",
    authenticate,
    getAll
);

// Get Innings By ID
router.get(
    "/:id",
    authenticate,
    getOne
);

// Update Innings
router.put(
    "/:id",
    authenticate,
    authorize("ADMIN", "ORGANIZER"),
    update
);

// Delete Innings
router.delete(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    remove
);

// Undo Last Ball
router.post(
    "/:inningsId/undo-last-ball",
    authorizeScorer,
    undoLastBall
);

router.post(
    "/:id/undo-last-ball",
    authorizeScorer,
    undoLastBall
);

export default router;