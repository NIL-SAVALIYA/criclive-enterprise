import {
  getCapsAndLeadersService,
  getHeadToHeadService,
  getTeamRecentFormService,
  getMVPLeaderboardService
} from "../services/recordsAndForm.service.js";

/**
 * Get Orange and Purple Cap Leaders
 */
export async function getCapsAndLeaders(req, res, next) {
  try {
    const { tournamentId } = req.query;
    const data = await getCapsAndLeadersService(tournamentId || null);
    return res.status(200).json({
      success: true,
      message: "Orange and Purple cap leaders fetched successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get MVP Leaderboard
 */
export async function getMVPLeaderboard(req, res, next) {
  try {
    const { tournamentId } = req.query;
    const data = await getMVPLeaderboardService(tournamentId || null);
    return res.status(200).json({
      success: true,
      message: "MVP leaderboard fetched successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Head to Head stats between two teams
 */
export async function getHeadToHead(req, res, next) {
  try {
    const { teamAId, teamBId } = req.params;
    const data = await getHeadToHeadService(teamAId, teamBId);
    return res.status(200).json({
      success: true,
      message: "Head to head stats fetched successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Team Recent Form
 */
export async function getTeamRecentForm(req, res, next) {
  try {
    const { teamId } = req.params;
    const data = await getTeamRecentFormService(teamId);
    return res.status(200).json({
      success: true,
      message: "Team recent form fetched successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
}
