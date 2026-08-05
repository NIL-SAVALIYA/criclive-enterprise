import {
  getNotificationsService,
  createNotificationService
} from "../services/notification.service.js";

/**
 * Get live event notifications
 */
export async function getNotifications(req, res, next) {
  try {
    const data = await getNotificationsService(20);
    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Post a notification
 */
export async function createNotification(req, res, next) {
  try {
    const { type, title, message, matchId } = req.body;
    const data = await createNotificationService({ type, title, message, matchId });
    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
}
