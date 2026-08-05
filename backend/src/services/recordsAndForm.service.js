import {
  getTopRunScorersRepository,
  getTopWicketTakersRepository,
  getHeadToHeadRepository,
  getTeamRecentFormRepository
} from "../repositories/records.repository.js";

/**
 * Get Orange & Purple Cap Leaders
 */
export async function getCapsAndLeadersService(tournamentId = null) {
  const topScorers = await getTopRunScorersRepository(tournamentId, 10);
  const topWicketTakers = await getTopWicketTakersRepository(tournamentId, 10);

  return {
    orangeCap: topScorers[0] || null,
    purpleCap: topWicketTakers[0] || null,
    topBattingLeaders: topScorers,
    topBowlingLeaders: topWicketTakers
  };
}

/**
 * Get Head to Head comparison between two teams
 */
export async function getHeadToHeadService(teamAId, teamBId) {
  return await getHeadToHeadRepository(teamAId, teamBId);
}

/**
 * Get Team Recent Form
 */
export async function getTeamRecentFormService(teamId) {
  return await getTeamRecentFormRepository(teamId, 5);
}

/**
 * Calculate Player MVP Ranking points for a tournament
 * MVP Formula = (Runs * 1.0) + (Fours * 1.0) + (Sixes * 2.0) + (Wickets * 20.0) + (DotBalls * 1.0)
 */
export async function getMVPLeaderboardService(tournamentId = null) {
  const topScorers = await getTopRunScorersRepository(tournamentId, 25);
  const topWicketTakers = await getTopWicketTakersRepository(tournamentId, 25);

  const mvpMap = new Map();

  topScorers.forEach((b) => {
    if (!b.player) return;
    const pts = b.totalRuns * 1.0 + b.fours * 1.0 + b.sixes * 2.0;
    mvpMap.set(b.player.id, {
      player: b.player,
      battingPoints: pts,
      bowlingPoints: 0,
      totalMVPPoints: pts
    });
  });

  topWicketTakers.forEach((bw) => {
    if (!bw.player) return;
    const pts = bw.totalWickets * 20.0;
    const existing = mvpMap.get(bw.player.id) || {
      player: bw.player,
      battingPoints: 0,
      bowlingPoints: 0,
      totalMVPPoints: 0
    };
    existing.bowlingPoints = pts;
    existing.totalMVPPoints = existing.battingPoints + pts;
    mvpMap.set(bw.player.id, existing);
  });

  return Array.from(mvpMap.values()).sort((a, b) => b.totalMVPPoints - a.totalMVPPoints);
}
