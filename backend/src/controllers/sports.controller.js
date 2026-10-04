import { getAllSportsService } from "../services/sports.service.js";

/**
 * Public GET /api/v1/sports endpoint
 * Returns all active sports supported by CricLive Enterprise
 */
export async function getAll(req, res) {
  try {
    const sports = await getAllSportsService();

    return res.status(200).json({
      success: true,
      data: sports
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sports."
    });
  }
}
