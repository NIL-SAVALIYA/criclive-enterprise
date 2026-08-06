import { Router } from "express";
import {
  create,
  getAll,
  getOne,
  update,
  remove
} from "../controllers/player.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { Roles } from "../constants/roles.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Player Routes (RBAC Protected)
|--------------------------------------------------------------------------
*/

// Create Player (ADMIN, ORGANIZER, TOURNAMENT_ADMIN, TEAM_MANAGER)
router.post(
  "/",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN, Roles.TEAM_MANAGER),
  create
);

// Get All Players (Authenticated read-only)
router.get(
  "/",
  authenticate,
  getAll
);

// Get Player By ID (Authenticated read-only)
router.get(
  "/:id",
  authenticate,
  getOne
);

// Update Player (ADMIN, ORGANIZER, TOURNAMENT_ADMIN, TEAM_MANAGER)
router.put(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN, Roles.TEAM_MANAGER),
  update
);

// Delete Player (ADMIN only)
router.delete(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN),
  remove
);

export default router;