import { Router } from "express";
import {
  create,
  getAll,
  getOne,
  update,
  remove
} from "../controllers/tournament.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { Roles } from "../constants/roles.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Tournament Routes (RBAC Protected)
|--------------------------------------------------------------------------
*/

// Create Tournament (ADMIN, ORGANIZER, TOURNAMENT_ADMIN)
router.post(
  "/",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN),
  create
);

// Get All Tournaments (Authenticated read-only)
router.get(
  "/",
  authenticate,
  getAll
);

// Get Tournament By ID (Authenticated read-only)
router.get(
  "/:id",
  authenticate,
  getOne
);

// Update Tournament (ADMIN, ORGANIZER, TOURNAMENT_ADMIN)
router.put(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN),
  update
);

// Delete Tournament (ADMIN only)
router.delete(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN),
  remove
);

export default router;