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

  const shotShots = [];

  balls.forEach((b) => {
    if (b.shotZone && zones[b.shotZone]) {
      zones[b.shotZone].runs += b.batRuns;
      zones[b.shotZone].balls += 1;
      if (b.isBoundaryFour) zones[b.shotZone].fours += 1;
      if (b.isBoundarySix) zones[b.shotZone].sixes += 1;
    }
    if (b.shotX !== null && b.shotY !== null) {
      shotShots.push({
        x: b.shotX,
        y: b.shotY,
        runs: b.batRuns,
        zone: b.shotZone || "Unknown",
        isWicket: b.isWicket,
        isFour: b.isBoundaryFour,
        isSix: b.isBoundarySix
      });
    }
  });

  return {
    zoneSummary: Object.values(zones),
    shotPoints: shotShots
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

  balls.forEach((b) => {
    if (b.pitchLength && pitchLengths[b.pitchLength] !== undefined) {
      pitchLengths[b.pitchLength] += 1;
    }
    if (b.pitchLine && pitchLines[b.pitchLine] !== undefined) {
      pitchLines[b.pitchLine] += 1;
    }
  });

  return {
    pitchLengths,
    pitchLines,
    totalDeliveries: balls.length
  };
}
