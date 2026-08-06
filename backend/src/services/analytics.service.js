import {
  getMatchBallsRepository,
  getInningsPartnershipsRepository,
  getInningsFallOfWicketsRepository
} from "../repositories/analytics.repository.js";
import { getLiveMatchService } from "./liveMatch.service.js";
import {
  buildWormGraphData,
  buildManhattanGraphData,
  buildWagonWheelData,
  buildPitchMapData
} from "../engine/analytics.engine.js";
import { calculateWinProbability } from "../engine/winProbability.engine.js";

/**
 * Get complete analytics payload for a match
 */
export async function getMatchAnalyticsService(matchId) {
  const allBalls = await getMatchBallsRepository(matchId);
  let liveMatchData = null;
  try {
    liveMatchData = await getLiveMatchService(matchId);
  } catch {
    // Match not started or live match info not initialized yet
  }

  const innings1Balls = allBalls.filter((b) => b.innings?.inningsNumber === 1);
  const innings2Balls = allBalls.filter((b) => b.innings?.inningsNumber === 2);

  // 1. Graphs
  const wormGraph = buildWormGraphData(innings1Balls, innings2Balls);
  const manhattanGraph = buildManhattanGraphData(innings1Balls, innings2Balls);

  // 2. Wagon Wheel & Pitch Map
  const wagonWheelInnings1 = buildWagonWheelData(innings1Balls);
  const wagonWheelInnings2 = buildWagonWheelData(innings2Balls);
  const pitchMapInnings1 = buildPitchMapData(innings1Balls);
  const pitchMapInnings2 = buildPitchMapData(innings2Balls);

  // 3. Win Probability
  let winProbability = null;
  if (liveMatchData && liveMatchData.match) {
    const currentInnings = liveMatchData.currentInnings || {};
    winProbability = calculateWinProbability({
      inningsNumber: currentInnings.inningsNumber || 1,
      totalRuns: currentInnings.totalRuns || 0,
      wickets: currentInnings.wickets || 0,
      legalBalls: currentInnings.legalBalls || 0,
      targetRuns: currentInnings.targetRuns || null,
      battingTeamName: currentInnings.battingTeam?.name || liveMatchData.match.teamA?.name,
      bowlingTeamName: currentInnings.bowlingTeam?.name || liveMatchData.match.teamB?.name
    });
  }

  return {
    matchId,
    wormGraph,
    manhattanGraph,
    wagonWheel: {
      innings1: wagonWheelInnings1,
      innings2: wagonWheelInnings2
    },
    pitchMap: {
      innings1: pitchMapInnings1,
      innings2: pitchMapInnings2
    },
    winProbability
  };
}

/**
 * Get partnerships timeline for an innings
 */
export async function getPartnershipTimelineService(inningsId) {
  return await getInningsPartnershipsRepository(inningsId);
}

/**
 * Get fall of wickets timeline for an innings
 */
export async function getFallOfWicketsTimelineService(inningsId) {
  return await getInningsFallOfWicketsRepository(inningsId);
}
