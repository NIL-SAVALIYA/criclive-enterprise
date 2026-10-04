import { Router } from "express";
import { getAll } from "../controllers/sports.controller.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Public Sports API Route
|--------------------------------------------------------------------------
*/

// GET /api/v1/sports - Get all active sports
router.get("/", getAll);

export default router;
