import { Router } from "express";
import { createBall } from "../controllers/ball.controller.js";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";
import { requireSport } from "../middleware/sportGuard.middleware.js";

const router = Router({
    mergeParams: true
});

router.post(
    "/",
    authorizeScorer,
    requireSport("CRICKET"),
    createBall
);

export default router;