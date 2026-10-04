/**
 * CricLive Enterprise — Batting & Player Eligibility Utility
 * Single authoritative client-side source of truth for:
 * 1. Striker Selection
 * 2. Non-Striker Selection
 * 3. Incoming Next Batter Selection (after wicket)
 * 
 * CORE CRICKET RULE:
 * All batting selectors must strictly be derived from innings.battingTeamId and its Playing XI.
 * Opposition / bowling team players must NEVER appear in any batting selector.
 */

/**
 * Resolves the authoritative batting team ID for the current innings or pre-match setup.
 *
 * @param {Object} params
 * @param {Object} [params.innings] - Active innings object (preferred single source of truth)
 * @param {Object} [params.match] - Match object containing teamAId, teamBId, toss details
 * @param {string} [params.tossWinnerId] - Toss winner team ID (pre-match)
 * @param {string} [params.tossDecision] - Toss decision ('BAT' or 'BOWL')
 * @returns {string|null}
 */
export function resolveBattingTeamId({ innings, match, tossWinnerId, tossDecision }) {
  // 1. If innings is active/live, innings.battingTeamId is the authoritative team
  if (innings?.battingTeamId) {
    return innings.battingTeamId;
  }
  if (innings?.battingTeam?.id) {
    return innings.battingTeam.id;
  }

  // 2. Pre-match toss resolution
  const winner = tossWinnerId || match?.tossWinnerId || match?.tossWinner?.id;
  const decision = tossDecision || match?.tossDecision;

  if (winner && decision) {
    if (decision === 'BAT') {
      return winner;
    }
    return winner === match?.teamAId ? match?.teamBId : match?.teamAId;
  }

  // Default fallback to teamA if no other info available yet
  return match?.teamAId || null;
}

/**
 * Resolves the authoritative bowling team ID for the current innings or pre-match setup.
 */
export function resolveBowlingTeamId({ innings, match, tossWinnerId, tossDecision }) {
  if (innings?.bowlingTeamId) {
    return innings.bowlingTeamId;
  }
  if (innings?.bowlingTeam?.id) {
    return innings.bowlingTeam.id;
  }

  const battingTeamId = resolveBattingTeamId({ innings, match, tossWinnerId, tossDecision });
  if (battingTeamId && match) {
    return battingTeamId === match.teamAId ? match.teamBId : match.teamAId;
  }
  return match?.teamBId || null;
}

/**
 * Extracts and normalizes the full Playing XI for the batting team,
 * enriched with live scorecard stats (runs, balls, isOut, dismissalType).
 *
 * @param {Object} params
 * @param {string} params.battingTeamId - The active batting team ID
 * @param {Object} [params.playingXI] - Playing XI data object { teamA: [...], teamB: [...] } or array
 * @param {Array} [params.scorecardBatting] - Batting scorecard list for current innings
 * @param {Object} [params.match] - Match details
 * @returns {Array<Object>} Normalized list of batting team Playing XI players
 */
export function getBattingXIPlayers({
  battingTeamId,
  playingXI,
  scorecardBatting = [],
  match
}) {
  if (!battingTeamId) return [];

  // Map of scorecard stats by player ID
  const scorecardMap = new Map();
  if (Array.isArray(scorecardBatting)) {
    scorecardBatting.forEach((b) => {
      const pId = b.id || b.playerId || b.player?.id;
      if (pId) {
        scorecardMap.set(pId, b);
      }
    });
  }

  // Extract raw Playing XI list for batting team
  let rawList = [];

  if (playingXI) {
    if (Array.isArray(playingXI)) {
      rawList = playingXI.filter((p) => (p.teamId || p.team?.id) === battingTeamId);
    } else if (playingXI.teamA || playingXI.teamB) {
      const isTeamA = match?.teamAId === battingTeamId;
      const teamList = isTeamA ? (playingXI.teamA?.players || playingXI.teamA) : (playingXI.teamB?.players || playingXI.teamB);
      if (Array.isArray(teamList)) {
        rawList = teamList;
      }
    }
  }

  // If playingXI is not passed or empty, fallback to scorecardBatting
  // (Since backend scorecardBatting is strictly created for the batting team)
  if (rawList.length === 0 && Array.isArray(scorecardBatting) && scorecardBatting.length > 0) {
    return scorecardBatting.map((b, idx) => {
      const pId = b.id || b.playerId || b.player?.id;
      return {
        id: pId,
        playerId: pId,
        teamId: battingTeamId,
        name: b.name || `${b.player?.firstName || ''} ${b.player?.lastName || ''}`.trim() || `Player ${idx + 1}`,
        jerseyNumber: b.jerseyNumber || b.player?.jerseyNumber || '',
        battingOrder: b.battingPosition || idx + 1,
        runs: Number(b.runs) || 0,
        balls: Number(b.balls) || 0,
        isOut: Boolean(b.isOut),
        dismissalType: b.dismissalType || null
      };
    });
  }

  return rawList.map((p, idx) => {
    const pId = p.playerId || p.player?.id || p.id;
    const card = scorecardMap.get(pId);

    const firstName = p.player?.firstName || p.firstName || '';
    const lastName = p.player?.lastName || p.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || p.name || `Player ${idx + 1}`;

    return {
      id: pId,
      playerId: pId,
      teamId: p.teamId || p.team?.id || battingTeamId,
      name: fullName,
      jerseyNumber: p.player?.jerseyNumber || p.jerseyNumber || '',
      battingOrder: p.battingOrder || idx + 1,
      runs: card ? Number(card.runs) || 0 : 0,
      balls: card ? Number(card.balls) || 0 : 0,
      isOut: card ? Boolean(card.isOut) : false,
      dismissalType: card ? card.dismissalType : null
    };
  });
}

/**
 * Computes eligible Striker options:
 * - Batting team Playing XI only
 * - Not dismissed (!isOut)
 * - Not the current non-striker
 *
 * @param {Object} params
 * @param {Array<Object>} params.battingXIPlayers
 * @param {string} params.currentNonStrikerId
 * @param {string} [params.currentStrikerId]
 * @returns {Array<Object>}
 */
export function getEligibleStrikers({
  battingXIPlayers = [],
  currentNonStrikerId,
  currentStrikerId
}) {
  return battingXIPlayers.filter((p) => {
    const pId = p.id || p.playerId;
    // Current striker is always allowed to remain in the options
    if (pId === currentStrikerId) return true;
    // Cannot be current non-striker
    if (currentNonStrikerId && pId === currentNonStrikerId) return false;
    // Cannot be dismissed
    if (p.isOut) return false;
    return true;
  });
}

/**
 * Computes eligible Non-Striker options:
 * - Batting team Playing XI only
 * - Not dismissed (!isOut)
 * - Not the current striker
 *
 * @param {Object} params
 * @param {Array<Object>} params.battingXIPlayers
 * @param {string} params.currentStrikerId
 * @param {string} [params.currentNonStrikerId]
 * @returns {Array<Object>}
 */
export function getEligibleNonStrikers({
  battingXIPlayers = [],
  currentStrikerId,
  currentNonStrikerId
}) {
  return battingXIPlayers.filter((p) => {
    const pId = p.id || p.playerId;
    // Current non-striker is always allowed to remain in the options
    if (pId === currentNonStrikerId) return true;
    // Cannot be current striker
    if (currentStrikerId && pId === currentStrikerId) return false;
    // Cannot be dismissed
    if (p.isOut) return false;
    return true;
  });
}

/**
 * Computes eligible Incoming Next Batter options after a wicket:
 * - Batting team Playing XI only
 * - Not dismissed (!isOut)
 * - Not current striker
 * - Not current non-striker
 * - Not the player being dismissed on this ball
 *
 * @param {Object} params
 * @param {Array<Object>} params.battingXIPlayers
 * @param {string} [params.currentStrikerId]
 * @param {string} [params.currentNonStrikerId]
 * @param {string} [params.dismissedPlayerId]
 * @returns {Array<Object>}
 */
export function getEligibleIncomingBatters({
  battingXIPlayers = [],
  currentStrikerId,
  currentNonStrikerId,
  dismissedPlayerId
}) {
  const excludedIds = new Set(
    [currentStrikerId, currentNonStrikerId, dismissedPlayerId].filter(Boolean)
  );

  return battingXIPlayers.filter((p) => {
    const pId = p.id || p.playerId;
    if (excludedIds.has(pId)) return false;
    if (p.isOut) return false;
    return true;
  });
}
