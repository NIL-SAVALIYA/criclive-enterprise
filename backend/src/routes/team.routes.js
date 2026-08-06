import { Router } from "express";
import {
  create,
  getAll,
  getOne,
  update,
  remove
} from "../controllers/team.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { Roles } from "../constants/roles.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Team Routes (RBAC Protected)
|--------------------------------------------------------------------------
*/

// Create Team (ADMIN, ORGANIZER, TOURNAMENT_ADMIN)
router.post(
  "/",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN),
  create
);

// Get All Teams (Authenticated read-only)
router.get(
  "/",
  authenticate,
  getAll
);

// Get Team By ID (Authenticated read-only)
router.get(
  "/:id",
  authenticate,
  getOne
);

// Update Team (ADMIN, ORGANIZER, TEAM_MANAGER)
router.put(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TEAM_MANAGER),
  update
);

// Delete Team (ADMIN only)
router.delete(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN),
  remove
);

export default router;