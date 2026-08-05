import { Router } from "express";
import { getCommentary } from "../controllers/commentary.controller.js";

const router = Router();

router.get("/:matchId/commentary", getCommentary);

export default router;