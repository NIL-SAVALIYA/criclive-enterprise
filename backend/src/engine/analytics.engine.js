/**
 * Analytics Engine
 * Transforms raw ball-by-ball and scorecard data into chart-ready structures
 */

/**
 * Process Worm Graph Data (Cumulative runs per over)
 */
export function buildWormGraphData(ballsInnings1 = [], ballsInnings2 = []) {
  const oversMap = new Map();

  // Process Innings 1
  let cumRuns1 = 0;
  ballsInnings1.forEach((b) => {
    cumRuns1 += b.totalRuns;
    oversMap.set(b.over, {
      over: b.over,
      innings1Runs: cumRuns1,
      innings2Runs: null
    });
  });

  // Process Innings 2
  let cumRuns2 = 0;
  ballsInnings2.forEach((b) => {
    cumRuns2 += b.totalRuns;
    const existing = oversMap.get(b.over) || { over: b.over, innings1Runs: null };
    oversMap.set(b.over, {
      ...existing,
      innings2Runs: cumRuns2
    });
  });

  return Array.from(oversMap.values()).sort((a, b) => a.over - b.over);
}

/**
 * Process Manhattan Graph Data (Runs scored per over)
 */
export function buildManhattanGraphData(ballsInnings1 = [], ballsInnings2 = []) {
  const overStats = (balls) => {
    const map = new Map();
    balls.forEach((b) => {
      const overNum = b.over;
      if (!map.has(overNum)) {
        map.set(overNum, { over: overNum, runs: 0, wickets: 0, boundaries: 0 });
      }
      const item = map.get(overNum);
      item.runs += b.totalRuns;
      if (b.isWicket) item.wickets += 1;
      if (b.isBoundaryFour || b.isBoundarySix) item.boundaries += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.over - b.over);
  };

  return {
    innings1: overStats(ballsInnings1),
    innings2: overStats(ballsInnings2)
  };
}

const ZONE_MAP = {
  "fine leg": "Fine Leg",
  "fine_leg": "Fine Leg",
  "square leg": "Square Leg",
  "square_leg": "Square Leg",
  "mid wicket": "Mid Wicket",
  "mid_wicket": "Mid Wicket",
  "midwicket": "Mid Wicket",
  "long on": "Long On",
  "long_on": "Long On",
  "long off": "Long Off",
  "long_off": "Long Off",
  "cover": "Cover",
  "covers": "Cover",
  "point": "Point",
  "third man": "Third Man",
  "third_man": "Third Man"
};

const ZONE_DEFAULT_COORDS = {
  "Fine Leg": { x: 55, y: -95 },
  "Square Leg": { x: 95, y: -40 },
  "Mid Wicket": { x: 95, y: 45 },
  "Long On": { x: 50, y: 95 },
  "Long Off": { x: -50, y: 95 },
  "Cover": { x: -95, y: 45 },
  "Point": { x: -95, y: -40 },
  "Third Man": { x: -55, y: -95 }
};

const LENGTH_MAP = {
  "yorker": "Yorker",
  "yorker length": "Yorker",
  "full": "Full",
  "full length": "Full",
  "good": "Good",
  "good length": "Good",
  "short": "Short",
  "short length": "Short"
};

const LINE_MAP = {
  "off": "Off",
  "outside off": "Off",
  "stumps": "Stumps",
  "middle": "Stumps",
  "leg": "Stumps",
  "wide": "Wide",
  "wide off": "Wide",
  "wide leg": "Wide"
};

/**
 * Process Wagon Wheel Zone Distribution
 */
export function buildWagonWheelData(balls = []) {
  const zones = {
    "Fine Leg": { zone: "Fine Leg", runs: 0, balls: 0, fours: 0, sixes: 0 },
    "Square Leg": { zone: "Square Leg", runs: 0, balls: 0, fours: 0, sixes: 0 },
    "Mid Wicket": { zone: "Mid Wicket", runs: 0, balls: 0, fours: 0, sixes: 0 },
    "Long On": { zone: "Long On", runs: 0, balls: 0, fours: 0, sixes: 0 },
    "Long Off": { zone: "Long Off", runs: 0, balls: 0, fours: 0, sixes: 0 },
    "Cover": { zone: "Cover", runs: 0, balls: 0, fours: 0, sixes: 0 },
    "Point": { zone: "Point", runs: 0, balls: 0, fours: 0, sixes: 0 },
    "Third Man": { zone: "Third Man", runs: 0, balls: 0, fours: 0, sixes: 0 }
  };

  const shotPoints = [];

  balls.forEach((b) => {
    const rawZone = (b.shotZone || "").trim().toLowerCase();
    const canonicalZone = ZONE_MAP[rawZone] || (zones[b.shotZone] ? b.shotZone : null);

    if (canonicalZone && zones[canonicalZone]) {
      zones[canonicalZone].runs += b.batRuns || 0;
      zones[canonicalZone].balls += 1;
      if (b.isBoundaryFour || b.batRuns === 4) zones[canonicalZone].fours += 1;
      if (b.isBoundarySix || b.batRuns === 6) zones[canonicalZone].sixes += 1;

      // Coordinate calculation
      let x = b.shotX;
      let y = b.shotY;
      if (x === null || y === null || (x === 0 && y === 0)) {
        const def = ZONE_DEFAULT_COORDS[canonicalZone] || { x: 0, y: 0 };
        const factor = (b.isBoundarySix || b.batRuns === 6) ? 1.25 : (b.isBoundaryFour || b.batRuns === 4) ? 1.1 : 0.8;
        x = Math.round(def.x * factor);
        y = Math.round(def.y * factor);
      }

      shotPoints.push({
        x,
        y,
        runs: b.batRuns || 0,
        totalRuns: b.totalRuns || 0,
        zone: canonicalZone,
        isWicket: Boolean(b.isWicket),
        isFour: Boolean(b.isBoundaryFour || b.batRuns === 4),
        isSix: Boolean(b.isBoundarySix || b.batRuns === 6)
      });
    }
  });

  return {
    zoneSummary: Object.values(zones),
    shotPoints
  };
}

/**
 * Process Pitch Map Heatmap Data
 */
export function buildPitchMapData(balls = []) {
  const pitchLengths = {
    "Yorker": 0,
    "Full": 0,
    "Good": 0,
    "Short": 0
  };

  const pitchLines = {
    "Off": 0,
    "Stumps": 0,
    "Wide": 0
  };

  const deliveries = [];

  balls.forEach((b) => {
    const rawLength = (b.pitchLength || "").trim().toLowerCase();
    const canonicalLength = LENGTH_MAP[rawLength] || (pitchLengths[b.pitchLength] !== undefined ? b.pitchLength : null);

    const rawLine = (b.pitchLine || "").trim().toLowerCase();
    const canonicalLine = LINE_MAP[rawLine] || (pitchLines[b.pitchLine] !== undefined ? b.pitchLine : null);

    if (canonicalLength && pitchLengths[canonicalLength] !== undefined) {
      pitchLengths[canonicalLength] += 1;
    }
    if (canonicalLine && pitchLines[canonicalLine] !== undefined) {
      pitchLines[canonicalLine] += 1;
    }

    if (canonicalLength || canonicalLine) {
      deliveries.push({
        id: b.id,
        over: b.over,
        ball: b.ball,
        pitchLength: canonicalLength || "Good",
        pitchLine: canonicalLine || "Stumps",
        totalRuns: b.totalRuns || 0,
        batRuns: b.batRuns || 0,
        isWicket: Boolean(b.isWicket),
        isFour: Boolean(b.isBoundaryFour || b.batRuns === 4),
        isSix: Boolean(b.isBoundarySix || b.batRuns === 6)
      });
    }
  });

  return {
    pitchLengths,
    pitchLines,
    deliveries,
    totalDeliveries: balls.length
  };
}
