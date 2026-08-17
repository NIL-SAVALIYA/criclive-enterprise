import { Router } from "express";
import { createBall } from "../controllers/ball.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";

const router = Router({
    mergeParams: true
});

router.post(
    "/",
    authenticate,
    authorizeScorer,
    createBall
);

export default router;