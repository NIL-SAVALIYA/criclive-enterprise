import prisma from "../config/db.js";

/**
 * Create a live event notification
 */
export async function createNotificationService({ type, title, message, matchId = null }) {
  return await prisma.notification.create({
    data: {
      type,
      title,
      message,
      matchId
    }
  });
}

/**
 * Get recent notifications / live event feed
 */
export async function getNotificationsService(limit = 20) {
  return await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit
  });
}
