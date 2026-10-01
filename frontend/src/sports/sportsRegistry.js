/**
 * CRICLIVE - Central Sport Configuration & Registry
 * 
 * Provides centralized sport capabilities, terminology, routing definitions,
 * and feature flags. Designed for clean extensibility when adding future sports.
 */

export const SPORTS_REGISTRY = {
  CRICKET: {
    id: 'cricket',
    code: 'CRICKET',
    name: 'Cricket',
    icon: '🏏',
    scoringModel: 'ball', // Ball-by-ball
    matchModel: 'innings',
    capabilities: {
      ballByBallScoring: true,
      rallyScoring: false,
      wickets: true,
      overs: true,
      innings: true,
      strikeRotation: true,
      toss: true,
      tossDecision: true,
      sets: false,
      games: false,
      serverReceiver: false,
      wagonWheel: true,
      pitchMap: true,
      winProbability: true,
      orangePurpleCaps: true
    },
    terminology: {
      score: 'Runs',
      subScore: 'Wickets',
      period: 'Overs',
      unit: 'Balls',
      team: 'Team',
      player: 'Player',
      courtOrPitch: 'Pitch',
      roundOrInnings: 'Innings',
      scorerTitle: 'Ball-by-Ball Scorer Console',
      scorerCta: 'Open Ball-by-Ball Scorer Console',
      heroBadge: '🏏 Next-Gen Enterprise Cricket Engine',
      heroHeadline: 'Real-Time Scoring, Deep Analytics & Tournament League Engine',
      heroSubline: 'Experience Cricbuzz-grade live ball-by-ball updates, Wagon Wheel shot analysis, Pitch Map heatmaps, win probability predictions, and comprehensive tournament standings.'
    },
    defaultVenue: 'National Cricket Stadium',
    routes: {
      base: '/cricket',
      live: '/cricket/live',
      fixtures: '/cricket/fixtures',
      tournaments: '/cricket/tournaments',
      teams: '/cricket/teams',
      players: '/cricket/players',
      scorer: '/cricket/admin/scorer'
    }
  },

  BADMINTON: {
    id: 'badminton',
    code: 'BADMINTON',
    name: 'Badminton',
    icon: '🏸',
    scoringModel: 'rally', // Rally / Point
    matchModel: 'sets',
    capabilities: {
      ballByBallScoring: false,
      rallyScoring: true,
      wickets: false,
      overs: false,
      innings: false,
      strikeRotation: false,
      toss: false,
      tossDecision: false,
      sets: true,
      games: true,
      serverReceiver: true,
      wagonWheel: false,
      pitchMap: false,
      winProbability: false,
      orangePurpleCaps: false
    },
    terminology: {
      score: 'Points',
      subScore: 'Sets Won',
      period: 'Game',
      unit: 'Rallies',
      team: 'Side',
      player: 'Player',
      courtOrPitch: 'Court',
      roundOrInnings: 'Game',
      scorerTitle: 'Rally Scoring Console',
      scorerCta: 'Open Rally Scoring Console',
      heroBadge: '🏸 Next-Gen Enterprise Badminton Engine',
      heroHeadline: 'Real-Time Rally Scoring, Match Analytics & Tournament Management',
      heroSubline: 'Experience live rally-by-rally updates, set-by-set scoring statistics, player match history, and comprehensive league tournament standings.'
    },
    defaultVenue: 'Badminton Indoor Arena',
    routes: {
      base: '/badminton',
      live: '/badminton/live',
      fixtures: '/badminton/fixtures',
      tournaments: '/badminton/tournaments',
      teams: '/badminton/teams',
      players: '/badminton/players',
      scorer: '/badminton/admin/scorer'
    }
  },

  FOOTBALL: {
    id: 'football',
    code: 'FOOTBALL',
    name: 'Football',
    icon: '⚽',
    scoringModel: 'goal',
    matchModel: 'halves',
    capabilities: {
      ballByBallScoring: false,
      rallyScoring: false,
      goalScoring: true,
      matchClock: true,
      halves: true,
      extraTime: true,
      penalties: true,
      yellowCards: true,
      redCards: true,
      substitutions: true,
      matchCompletion: true,
      wickets: false,
      overs: false,
      innings: false,
      strikeRotation: false,
      toss: true,
      tossDecision: false,
      sets: false,
      games: false,
      serverReceiver: false,
      wagonWheel: false,
      pitchMap: false,
      winProbability: false,
      orangePurpleCaps: false
    },
    terminology: {
      score: 'Goals',
      subScore: 'Half',
      period: 'Half',
      unit: 'Minutes',
      team: 'Club',
      player: 'Player',
      courtOrPitch: 'Pitch',
      roundOrInnings: 'Half',
      scorerTitle: 'Match Event Console',
      scorerCta: 'Open Match Event Console',
      heroBadge: '⚽ Next-Gen Enterprise Football Engine',
      heroHeadline: 'Real-Time Match Events, Tactical Analytics & Tournament Management',
      heroSubline: 'Experience live match clock tracking, goal event timelines, discipline cards, substitutions, and comprehensive league tournament standings.'
    },
    defaultVenue: 'Football Stadium',
    routes: {
      base: '/football',
      live: '/football/live',
      fixtures: '/football/fixtures',
      tournaments: '/football/tournaments',
      teams: '/football/teams',
      players: '/football/players',
      scorer: '/football/admin/scorer'
    }
  }
};

/**
 * Returns configuration for a sport code. Defaults to CRICKET if not found.
 */
export function getSportConfig(sportCode) {
  if (!sportCode) return SPORTS_REGISTRY.CRICKET;
  const clean = sportCode.toString().trim().toUpperCase();
  return SPORTS_REGISTRY[clean] || SPORTS_REGISTRY.CRICKET;
}

/**
 * Returns list of all registered sports.
 */
export function getAllRegisteredSports() {
  return Object.values(SPORTS_REGISTRY);
}

/**
 * Checks whether a given sport supports a capability.
 */
export function hasCapability(sportCode, capability) {
  const config = getSportConfig(sportCode);
  return Boolean(config?.capabilities?.[capability]);
}

/**
 * Resolves sport code from a given URL pathname, or returns null if not sport-prefixed.
 */
export function getSportFromPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  const lower = pathname.toLowerCase();
  if (lower.startsWith('/cricket')) return 'CRICKET';
  if (lower.startsWith('/badminton')) return 'BADMINTON';
  if (lower.startsWith('/football')) return 'FOOTBALL';
  return null;
}
