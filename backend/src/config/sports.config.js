/**
 * Centralized Sport Registry & Capabilities Configuration (Backend)
 * 
 * Defines sport metadata, models, rules, capabilities, and terminology.
 * New sports (e.g. Football, Tennis) can be registered here without modifying existing sport engines.
 */

export const SPORTS_CONFIG = {
  CRICKET: {
    id: "cricket",
    code: "CRICKET",
    name: "Cricket",
    icon: "🏏",
    scoringModel: "ball", // ball-by-ball delivery
    matchModel: "innings",
    capabilities: {
      ballByBallScoring: true,
      rallyScoring: false,
      wickets: true,
      overs: true,
      innings: true,
      strikeRotation: true,
      toss: true,
      tossDecision: true, // BAT / BOWL
      sets: false,
      games: false,
      serverReceiver: false,
      wagonWheel: true,
      pitchMap: true,
      winProbability: true,
      orangePurpleCaps: true
    },
    terminology: {
      score: "Runs",
      subScore: "Wickets",
      period: "Overs",
      unit: "Balls",
      team: "Team",
      player: "Player",
      courtOrPitch: "Pitch",
      roundOrInnings: "Innings",
      scorerTitle: "Ball-by-Ball Scorer Console",
      scorerCta: "Open Ball-by-Ball Scorer Console"
    },
    defaultVenue: "National Cricket Stadium"
  },

  BADMINTON: {
    id: "badminton",
    code: "BADMINTON",
    name: "Badminton",
    icon: "🏸",
    scoringModel: "rally", // rally / point scoring
    matchModel: "sets", // sets / games (e.g., best of 3 games to 21)
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
      score: "Points",
      subScore: "Sets Won",
      period: "Game",
      unit: "Rallies",
      team: "Side",
      player: "Player",
      courtOrPitch: "Court",
      roundOrInnings: "Game",
      scorerTitle: "Rally Scoring Console",
      scorerCta: "Open Rally Scoring Console"
    },
    defaultVenue: "Badminton Indoor Arena"
  },

  FOOTBALL: {
    id: "football",
    code: "FOOTBALL",
    name: "Football",
    icon: "⚽",
    scoringModel: "goal", // goal scoring
    matchModel: "halves", // two halves of 45 minutes
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
      tossDecision: false, // Coin toss for side / kickoff
      sets: false,
      games: false,
      serverReceiver: false,
      wagonWheel: false,
      pitchMap: false,
      winProbability: false,
      orangePurpleCaps: false
    },
    terminology: {
      score: "Goals",
      subScore: "Half",
      period: "Half",
      unit: "Minutes",
      team: "Club",
      player: "Player",
      courtOrPitch: "Pitch",
      roundOrInnings: "Half",
      scorerTitle: "Match Event Console",
      scorerCta: "Open Match Event Console"
    },
    defaultVenue: "Football Stadium"
  },
  
  TABLE_TENNIS: {
    id: "table-tennis",
    code: "TABLE_TENNIS",
    name: "Table Tennis",
    icon: "🏓",
    scoringModel: "rally",
    matchModel: "table_tennis",
    capabilities: {
      singles: true,
      doubles: true,
      games: true,
      points: true,
      service: true,
      undo: true,
      liveScoring: true,
      ballByBallScoring: false,
      rallyScoring: true,
      wickets: false,
      overs: false,
      innings: false,
      strikeRotation: false,
      toss: false,
      tossDecision: false,
      sets: false,
      serverReceiver: true,
      wagonWheel: false,
      pitchMap: false,
      winProbability: false,
      orangePurpleCaps: false
    },
    terminology: {
      score: "Points",
      subScore: "Games",
      period: "Game",
      unit: "Rallies",
      team: "Team / Side",
      player: "Player",
      courtOrPitch: "Table",
      roundOrInnings: "Game",
      server: "Server",
      receiver: "Receiver",
      scorerTitle: "Table Tennis Scoring Console",
      scorerCta: "Open Table Tennis Console"
    },
    defaultVenue: "Table Tennis Arena"
  }
};

/**
 * Returns configuration for a given sport code.
 */
export function getSportConfig(sportCode) {
  if (!sportCode) return SPORTS_CONFIG.CRICKET;
  const clean = sportCode.toString().trim().toUpperCase();
  return SPORTS_CONFIG[clean] || SPORTS_CONFIG.CRICKET;
}

/**
 * Checks whether a sport supports a given capability.
 */
export function hasCapability(sportCode, capability) {
  const config = getSportConfig(sportCode);
  return Boolean(config?.capabilities?.[capability]);
}
