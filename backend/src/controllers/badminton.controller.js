import {
  getBadmintonMatchStateService,
  recordBadmintonPointService,
  undoBadmintonPointService
} from "../services/badmintonMatch.service.js";

/**
 * GET /api/v1/badminton/matches/:matchId/state
 * Retrieves Badminton match state and point history.
 */
export async function getMatchState(req, res) {
  try {
    const { matchId } = req.params;
    const result = await getBadmintonMatchStateService(matchId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch Badminton match state."
    });
  }
}

/**
 * POST /api/v1/badminton/matches/:matchId/points
 * Records a rally point for a Badminton match.
 */
export async function recordPoint(req, res) {
  try {
    const { matchId } = req.params;
    const { scoringTeamId, serverId, receiverId, commentary } = req.body;

    if (!scoringTeamId) {
      return res.status(400).json({
        success: false,
        message: "scoringTeamId is required."
      });
    }

    const result = await recordBadmintonPointService(
      matchId,
      { scoringTeamId, serverId, receiverId, commentary },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Point recorded successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to record Badminton point."
    });
  }
}

/**
 * POST /api/v1/badminton/matches/:matchId/undo
 * Undoes the last rally point of a Badminton match.
 */
export async function undoPoint(req, res) {
  try {
    const { matchId } = req.params;
    const result = await undoBadmintonPointService(matchId, req.user);

    return res.status(200).json({
      success: true,
      message: "Last Badminton point undone successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to undo Badminton point."
    });
  }
}
