import { Router } from "express";
import {
  create,
  getAll,
  getOne,
  update,
  remove
} from "../controllers/match.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { Roles } from "../constants/roles.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Match Routes (RBAC Protected)
|--------------------------------------------------------------------------
*/

// Create Match (ADMIN, ORGANIZER, TOURNAMENT_ADMIN)
router.post(
  "/",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN),
  create
);

// Get All Matches (Authenticated read-only)
router.get(
  "/",
  getAll
);

// Get Match By ID (Authenticated read-only)
router.get(
  "/:id",
  authenticate,
  getOne
);

// Update Match (ADMIN, ORGANIZER, TOURNAMENT_ADMIN, SCORER)
router.put(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN, Roles.ORGANIZER, Roles.TOURNAMENT_ADMIN, Roles.SCORER),
  update
);

// Delete Match (ADMIN only)
router.delete(
  "/:id",
  authenticate,
  authorize(Roles.ADMIN),
  remove
);

export default router;