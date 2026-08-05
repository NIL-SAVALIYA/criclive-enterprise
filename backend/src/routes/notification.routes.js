import { Router } from "express";
import {
  getNotifications,
  createNotification
} from "../controllers/notification.controller.js";

const router = Router();

router.get("/", getNotifications);
router.post("/", createNotification);

export default router;
