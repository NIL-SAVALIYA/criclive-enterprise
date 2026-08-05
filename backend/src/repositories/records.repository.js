import prisma from "../config/db.js";

/**
 * Fetch top batting run scorers
 */
export async function getTopRunScorersRepository(tournamentId = null, limit = 10) {
  const whereCondition = tournamentId
    ? { innings: { match: { tournamentId } } }
    : {};

  const scores = await prisma.battingScorecard.groupBy({
    by: ["playerId"],
    where: whereCondition,
    _sum: {
      runs: true,
      balls: true,
      fours: true,
      sixes: true
    },
    _max: {
      runs: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        runs: "desc"
      }
    },
    take: limit
  });

  // Enrich with Player info
  const playerIds = scores.map((s) => s.playerId);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    include: { team: true }
  });

  const playerMap = new Map(players.map((p) => [p.id, p]));

  return scores.map((s) => {
    const player = playerMap.get(s.playerId);
    const runs = s._sum.runs || 0;
    const balls = s._sum.balls || 0;
    return {
      player,
      totalRuns: runs,
      totalBalls: balls,
      highestScore: s._max.runs || 0,
      inningsPlayed: s._count.id,
      fours: s._sum.fours || 0,
      sixes: s._sum.sixes || 0,
      strikeRate: balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(2)) : 0
    };
  });
}

/**
 * Fetch top bowling wicket takers
 */
export async function getTopWicketTakersRepository(tournamentId = null, limit = 10) {
  const whereCondition = tournamentId
    ? { innings: { match: { tournamentId } } }
    : {};

  const scores = await prisma.bowlingScorecard.groupBy({
    by: ["bowlerId"],
    where: whereCondition,
    _sum: {
      wickets: true,
      runs: true,
      balls: true,
      maidens: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        wickets: "desc"
      }
    },
    take: limit
  });

  const bowlerIds = scores.map((s) => s.bowlerId);
  const bowlers = await prisma.player.findMany({
    where: { id: { in: bowlerIds } },
    include: { team: true }
  });

  const bowlerMap = new Map(bowlers.map((b) => [b.id, b]));

  return scores.map((s) => {
    const bowler = bowlerMap.get(s.bowlerId);
    const wickets = s._sum.wickets || 0;
    const runs = s._sum.runs || 0;
    const balls = s._sum.balls || 0;
    const overs = (balls / 6).toFixed(1);
    return {
      player: bowler,
      totalWickets: wickets,
      totalRunsConceded: runs,
      totalBallsBowled: balls,
      overs,
      inningsBowled: s._count.id,
      economy: balls > 0 ? parseFloat(((runs / balls) * 6).toFixed(2)) : 0
    };
  });
}

/**
 * Fetch Head to Head match history between two teams
 */
export async function getHeadToHeadRepository(teamAId, teamBId) {
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { teamAId, teamBId },
        { teamAId: teamBId, teamBId: teamAId }
      ],
      status: "COMPLETED"
    },
    include: {
      teamA: true,
      teamB: true,
      winnerTeam: true,
      tournament: true
    },
    orderBy: { matchDate: "desc" }
  });

  let teamAWins = 0;
  let teamBWins = 0;
  let ties = 0;
  let noResults = 0;

  matches.forEach((m) => {
    if (m.winnerTeamId === teamAId) teamAWins++;
    else if (m.winnerTeamId === teamBId) teamBWins++;
    else if (m.resultType === "TIE") ties++;
    else noResults++;
  });

  return {
    totalMatches: matches.length,
    teamAWins,
    teamBWins,
    ties,
    noResults,
    recentMatches: matches.slice(0, 5)
  };
}

/**
 * Fetch Recent Form (Last 5 matches for a team)
 */
export async function getTeamRecentFormRepository(teamId, limit = 5) {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ teamAId: teamId }, { teamBId: teamId }],
      status: "COMPLETED"
    },
    include: {
      teamA: true,
      teamB: true,
      winnerTeam: true
    },
    orderBy: { matchDate: "desc" },
    take: limit
  });

  return matches.map((m) => {
    const isWin = m.winnerTeamId === teamId;
    const isTie = m.resultType === "TIE";
    return {
      matchId: m.id,
      opponent: m.teamAId === teamId ? m.teamB : m.teamA,
      result: isWin ? "W" : isTie ? "T" : "L",
      margin: m.winningMargin,
      date: m.matchDate
    };
  });
}
