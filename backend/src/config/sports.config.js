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
