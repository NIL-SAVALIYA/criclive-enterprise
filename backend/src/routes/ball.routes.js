import { Router } from "express";
import { createBall } from "../controllers/ball.controller.js";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";

const router = Router({
    mergeParams: true
});

router.post(
    "/",
    authorizeScorer,
    createBall
);

export default router;