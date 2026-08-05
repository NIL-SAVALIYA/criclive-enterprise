import {
  getMatchAnalyticsService,
  getPartnershipTimelineService,
  getFallOfWicketsTimelineService
} from "../services/analytics.service.js";

/**
 * Controller to get full match analytics (Worm, Manhattan, Wagon Wheel, Pitch Map, Win Prob)
 */
export async function getMatchAnalytics(req, res, next) {
  try {
    const { matchId } = req.params;
    const data = await getMatchAnalyticsService(matchId);
    return res.status(200).json({
      success: true,
      message: "Match analytics fetched successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to get partnership timeline for an innings
 */
export async function getPartnershipTimeline(req, res, next) {
  try {
    const { inningsId } = req.params;
    const data = await getPartnershipTimelineService(inningsId);
    return res.status(200).json({
      success: true,
      message: "Partnership timeline fetched successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to get fall of wickets timeline
 */
export async function getFallOfWicketsTimeline(req, res, next) {
  try {
    const { inningsId } = req.params;
    const data = await getFallOfWicketsTimelineService(inningsId);
    return res.status(200).json({
      success: true,
      message: "Fall of wickets timeline fetched successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
}
