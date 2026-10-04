import {
  startTableTennisMatchService,
  getTableTennisMatchStateService,
  recordTableTennisPointService,
  undoTableTennisPointService
} from "../services/tableTennisMatch.service.js";
import { getTableTennisScorecard } from "../repositories/tableTennis.repository.js";

/**
 * POST /api/v1/table-tennis/matches/:matchId/start
 */
export async function startMatch(req, res) {
  try {
    const { matchId } = req.params;
    const result = await startTableTennisMatchService(matchId, req.body);

    return res.status(200).json({
      success: true,
      message: "Table Tennis match started successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to start Table Tennis match."
    });
  }
}

/**
 * GET /api/v1/table-tennis/matches/:matchId/state
 */
export async function getMatchState(req, res) {
  try {
    const { matchId } = req.params;
    const result = await getTableTennisMatchStateService(matchId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch Table Tennis match state."
    });
  }
}

/**
 * POST /api/v1/table-tennis/matches/:matchId/point
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

    const result = await recordTableTennisPointService(
      matchId,
      { scoringTeamId, serverId, receiverId, commentary }
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
      message: error.message || "Failed to record point."
    });
  }
}

/**
 * POST /api/v1/table-tennis/matches/:matchId/undo
 */
export async function undoPoint(req, res) {
  try {
    const { matchId } = req.params;
    
    const result = await undoTableTennisPointService(matchId);

    return res.status(200).json({
      success: true,
      message: "Point undone successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to undo point."
    });
  }
}

/**
 * GET /api/v1/table-tennis/matches/:matchId/scorecard
 */
export async function getScorecard(req, res) {
  try {
    const { matchId } = req.params;
    
    // We validate the match via the service to ensure sport code checks
    await getTableTennisMatchStateService(matchId);
    
    const result = await getTableTennisScorecard(matchId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch Table Tennis scorecard."
    });
  }
}
