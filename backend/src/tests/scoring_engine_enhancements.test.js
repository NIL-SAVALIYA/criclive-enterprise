import assert from "node:assert";
import prisma from "../config/db.js";
import { shouldRotateStrike, calculateCompletedRuns, getNextStrike } from "../engine/strike.engine.js";
import { buildWagonWheelData, buildPitchMapData } from "../engine/analytics.engine.js";
import { createBallService } from "../services/ball.service.js";
import { startMatch } from "../services/startMatch.service.js";

async function runTests() {
  console.log("\n🧪 Running Scoring Engine, Player State, Wagon Wheel & Pitch Map Test Suite...\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}:`, err.message);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // UNIT TESTS: Strike Rotation & Physical Completed Runs
  // -------------------------------------------------------------
  console.log("--- 1. Strike Engine & Physical Runs Unit Tests ---");

  test("Odd runs (1 run) swaps strike", () => {
    assert.strictEqual(calculateCompletedRuns({ batRuns: 1, extraRuns: 0, extraType: "NONE" }), 1);
    assert.strictEqual(shouldRotateStrike({ batRuns: 1, extraRuns: 0, extraType: "NONE" }), true);
  });

  test("Even runs (0, 2 runs) do not swap strike", () => {
    assert.strictEqual(calculateCompletedRuns({ batRuns: 0, extraRuns: 0, extraType: "NONE" }), 0);
    assert.strictEqual(shouldRotateStrike({ batRuns: 0, extraRuns: 0, extraType: "NONE" }), false);
    assert.strictEqual(calculateCompletedRuns({ batRuns: 2, extraRuns: 0, extraType: "NONE" }), 2);
    assert.strictEqual(shouldRotateStrike({ batRuns: 2, extraRuns: 0, extraType: "NONE" }), false);
  });

  test("Boundaries (4, 6 runs) do not swap strike", () => {
    assert.strictEqual(calculateCompletedRuns({ batRuns: 4, extraRuns: 0, extraType: "NONE" }), 0);
    assert.strictEqual(shouldRotateStrike({ batRuns: 4, extraRuns: 0, extraType: "NONE" }), false);
    assert.strictEqual(calculateCompletedRuns({ batRuns: 6, extraRuns: 0, extraType: "NONE" }), 0);
    assert.strictEqual(shouldRotateStrike({ batRuns: 6, extraRuns: 0, extraType: "NONE" }), false);
  });

  test("3 runs (odd) swaps strike", () => {
    assert.strictEqual(calculateCompletedRuns({ batRuns: 3, extraRuns: 0, extraType: "NONE" }), 3);
    assert.strictEqual(shouldRotateStrike({ batRuns: 3, extraRuns: 0, extraType: "NONE" }), true);
  });

  test("Standard 1-run wide penalty does not swap strike", () => {
    assert.strictEqual(calculateCompletedRuns({ batRuns: 0, extraRuns: 1, extraType: "WIDE" }), 0);
    assert.strictEqual(shouldRotateStrike({ batRuns: 0, extraRuns: 1, extraType: "WIDE" }), false);
  });

  test("Wide with 1 extra run taken physically (2 extraRuns total) swaps strike", () => {
    assert.strictEqual(calculateCompletedRuns({ batRuns: 0, extraRuns: 2, extraType: "WIDE" }), 1);
    assert.strictEqual(shouldRotateStrike({ batRuns: 0, extraRuns: 2, extraType: "WIDE" }), true);
  });

  test("Byes / Leg Byes (1 run) swaps strike", () => {
    assert.strictEqual(calculateCompletedRuns({ batRuns: 0, extraRuns: 1, extraType: "BYE" }), 1);
    assert.strictEqual(shouldRotateStrike({ batRuns: 0, extraRuns: 1, extraType: "BYE" }), true);
    assert.strictEqual(calculateCompletedRuns({ batRuns: 0, extraRuns: 1, extraType: "LEG_BYE" }), 1);
    assert.strictEqual(shouldRotateStrike({ batRuns: 0, extraRuns: 1, extraType: "LEG_BYE" }), true);
  });

  test("Byes (4 runs boundary) does not swap strike", () => {
    assert.strictEqual(calculateCompletedRuns({ batRuns: 0, extraRuns: 4, extraType: "BYE" }), 0);
    assert.strictEqual(shouldRotateStrike({ batRuns: 0, extraRuns: 4, extraType: "BYE" }), false);
  });

  test("End of over with 0 runs swaps strike", () => {
    const next = getNextStrike({
      strikerId: "p1",
      nonStrikerId: "p2",
      batRuns: 0,
      extraRuns: 0,
      extraType: "NONE",
      overCompleted: true
    });
    assert.strictEqual(next.strikerId, "p2");
    assert.strictEqual(next.nonStrikerId, "p1");
  });

  test("End of over with 1 run cancels out to keep original striker on strike for next over", () => {
    // 1 run swaps strike during delivery (p2 is now on strike), then over completion swaps again (p1 is on strike)
    const next = getNextStrike({
      strikerId: "p1",
      nonStrikerId: "p2",
      batRuns: 1,
      extraRuns: 0,
      extraType: "NONE",
      overCompleted: true
    });
    assert.strictEqual(next.strikerId, "p1");
    assert.strictEqual(next.nonStrikerId, "p2");
  });

  // -------------------------------------------------------------
  // UNIT TESTS: Analytics Engine (Wagon Wheel & Pitch Map)
  // -------------------------------------------------------------
  console.log("\n--- 2. Analytics Engine (Wagon Wheel & Pitch Map) Unit Tests ---");

  test("Wagon Wheel aggregates runs and boundaries across 8 canonical zones", () => {
    const mockBalls = [
      { shotZone: "Mid Wicket", batRuns: 4, isBoundaryFour: true, isBoundarySix: false, shotX: 95, shotY: 45 },
      { shotZone: "mid_wicket", batRuns: 6, isBoundaryFour: false, isBoundarySix: true, shotX: 110, shotY: 55 },
      { shotZone: "Cover", batRuns: 1, isBoundaryFour: false, isBoundarySix: false, shotX: -80, shotY: 40 },
      { shotZone: "Point", batRuns: 2, isBoundaryFour: false, isBoundarySix: false, shotX: -90, shotY: -35 }
    ];

    const result = buildWagonWheelData(mockBalls);
    assert.strictEqual(result.zoneSummary.length, 8);
    const midWicket = result.zoneSummary.find(z => z.zone === "Mid Wicket");
    assert.strictEqual(midWicket.runs, 10);
    assert.strictEqual(midWicket.balls, 2);
    assert.strictEqual(midWicket.fours, 1);
    assert.strictEqual(midWicket.sixes, 1);

    const cover = result.zoneSummary.find(z => z.zone === "Cover");
    assert.strictEqual(cover.runs, 1);
    assert.strictEqual(cover.balls, 1);

    assert.strictEqual(result.shotPoints.length, 4);
  });

  test("Pitch Map normalizes pitch length and line distributions and outputs deliveries", () => {
    const mockBalls = [
      { id: "b1", over: 0, ball: 1, pitchLength: "Yorker", pitchLine: "Stumps", batRuns: 0, totalRuns: 0, isWicket: false },
      { id: "b2", over: 0, ball: 2, pitchLength: "good length", pitchLine: "off", batRuns: 4, totalRuns: 4, isBoundaryFour: true },
      { id: "b3", over: 0, ball: 3, pitchLength: "Short", pitchLine: "Wide", batRuns: 6, totalRuns: 6, isBoundarySix: true }
    ];

    const result = buildPitchMapData(mockBalls);
    assert.strictEqual(result.pitchLengths["Yorker"], 1);
    assert.strictEqual(result.pitchLengths["Good"], 1);
    assert.strictEqual(result.pitchLengths["Short"], 1);
    assert.strictEqual(result.pitchLines["Stumps"], 1);
    assert.strictEqual(result.pitchLines["Off"], 1);
    assert.strictEqual(result.pitchLines["Wide"], 1);
    assert.strictEqual(result.deliveries.length, 3);
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: Database & Scoring Service Rules
  // -------------------------------------------------------------
  console.log("\n--- 3. Database & Scoring Service Integration Tests ---");

  let testTournament;
  let testTeamA;
  let testTeamB;
  let testMatch;
  let testInnings;
  let playersA = [];
  let playersB = [];

  await asyncTest("Setup fresh isolated match with Playing XI for scoring tests", async () => {
    const ts = Date.now();
    testTournament = await prisma.tournament.create({
      data: {
        name: `Scoring Test Cup ${ts}`,
        format: "LEAGUE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: "UPCOMING"
      }
    });

    testTeamA = await prisma.team.create({
      data: { name: `Team Alpha ${ts}`, shortName: `TA${ts.toString().slice(-4)}`, city: "Alpha City" }
    });

    testTeamB = await prisma.team.create({
      data: { name: `Team Beta ${ts}`, shortName: `TB${ts.toString().slice(-4)}`, city: "Beta City" }
    });

    // Create 11 players for Team A
    for (let i = 1; i <= 11; i++) {
      const p = await prisma.player.create({
        data: {
          firstName: `AlphaPlayer${i}`,
          lastName: `${ts}`,
          teamId: testTeamA.id,
          playerType: i <= 5 ? "BATSMAN" : i <= 7 ? "ALL_ROUNDER" : "BOWLER",
          jerseyNumber: i
        }
      });
      playersA.push(p);
    }

    // Create 11 players for Team B
    for (let i = 1; i <= 11; i++) {
      const p = await prisma.player.create({
        data: {
          firstName: `BetaPlayer${i}`,
          lastName: `${ts}`,
          teamId: testTeamB.id,
          playerType: i <= 5 ? "BATSMAN" : i <= 7 ? "ALL_ROUNDER" : "BOWLER",
          jerseyNumber: i
        }
      });
      playersB.push(p);
    }

    testMatch = await prisma.match.create({
      data: {
        tournamentId: testTournament.id,
        teamAId: testTeamA.id,
        teamBId: testTeamB.id,
        matchDate: new Date(),
        venue: "Scoring Test Ground",
        status: "UPCOMING",
        tossWinnerId: testTeamA.id,
        tossDecision: "BAT"
      }
    });

    // Create Playing XI
    await prisma.playingXI.createMany({
      data: [
        ...playersA.map((p, idx) => ({
          matchId: testMatch.id,
          teamId: testTeamA.id,
          playerId: p.id,
          battingOrder: idx + 1,
          isCaptain: idx === 0,
          isWicketKeeper: idx === 1
        })),
        ...playersB.map((p, idx) => ({
          matchId: testMatch.id,
          teamId: testTeamB.id,
          playerId: p.id,
          battingOrder: idx + 1,
          isCaptain: idx === 0,
          isWicketKeeper: idx === 1
        }))
      ]
    });

    // Start match
    await startMatch(
      testMatch.id,
      playersA[0].id,
      playersA[1].id,
      playersB[10].id,
      null
    );

    testInnings = await prisma.innings.findFirst({
      where: { matchId: testMatch.id, status: "LIVE" }
    });

    assert.ok(testInnings, "Innings should be created and LIVE");
  });

  await asyncTest("Enforces striker !== non-striker on ball recording", async () => {
    let errorCaught = false;
    try {
      await createBallService({
        inningsId: testInnings.id,
        batsmanId: playersA[0].id,
        nonStrikerId: playersA[0].id, // Same player!
        bowlerId: playersB[10].id,
        batRuns: 1,
        extraRuns: 0,
        extraType: "NONE"
      });
    } catch (err) {
      errorCaught = true;
      assert.ok(
        err.message.includes("cannot be the same") || err.message.includes("Striker and non-striker"),
        "Error message should mention striker and non-striker cannot be the same"
      );
    }
    assert.strictEqual(errorCaught, true, "Should throw error when striker and non-striker are identical");
  });

  await asyncTest("Records deliveries and persists shotZone, pitchLength, pitchLine", async () => {
    // Deliver ball 1 of over 0: 1 run to Mid Wicket (Short Length, Off line) -> Rotates strike
    const res1 = await createBallService({
      inningsId: testInnings.id,
      batsmanId: playersA[0].id,
      nonStrikerId: playersA[1].id,
      bowlerId: playersB[10].id,
      batRuns: 1,
      extraRuns: 0,
      extraType: "NONE",
      shotZone: "Mid Wicket",
      shotX: 95,
      shotY: 45,
      pitchLength: "Short",
      pitchLine: "Off"
    });

    assert.strictEqual(res1.liveScore.strike.strikerId, playersA[1].id, "Striker should now be player 2");
    assert.strictEqual(res1.ball.shotZone, "Mid Wicket");
    assert.strictEqual(res1.ball.pitchLength, "Short");
    assert.strictEqual(res1.ball.pitchLine, "Off");

    // Complete over 0 (5 more balls by bowler playersB[10])
    for (let b = 2; b <= 6; b++) {
      await createBallService({
        inningsId: testInnings.id,
        batsmanId: playersA[1].id,
        nonStrikerId: playersA[0].id,
        bowlerId: playersB[10].id,
        batRuns: 0,
        extraRuns: 0,
        extraType: "NONE",
        shotZone: "Cover",
        pitchLength: "Good",
        pitchLine: "Stumps"
      });
    }

    const updatedInnings = await prisma.innings.findUnique({ where: { id: testInnings.id } });
    assert.strictEqual(updatedInnings.legalBalls, 6, "Over 0 completed with 6 legal balls");
  });

  await asyncTest("Prevents consecutive over by same bowler (bowler consecutive over rule)", async () => {
    let errorCaught = false;
    try {
      // Over 0 was bowled by playersB[10]. Trying to bowl first ball of over 1 with playersB[10] must fail!
      await createBallService({
        inningsId: testInnings.id,
        batsmanId: playersA[0].id,
        nonStrikerId: playersA[1].id,
        bowlerId: playersB[10].id, // Same bowler who bowled previous over!
        batRuns: 1,
        extraRuns: 0,
        extraType: "NONE"
      });
    } catch (err) {
      errorCaught = true;
      assert.ok(
        err.message.includes("consecutive") || err.message.includes("Consecutive over violation"),
        `Error message must mention consecutive over: ${err.message}`
      );
    }
    assert.strictEqual(errorCaught, true, "Must throw 400 consecutive over violation");
  });

  await asyncTest("Allows a different eligible bowler to bowl the next over", async () => {
    // Bowler playersB[9] bowls over 1 ball 1
    const res = await createBallService({
      inningsId: testInnings.id,
      batsmanId: playersA[0].id,
      nonStrikerId: playersA[1].id,
      bowlerId: playersB[9].id, // Eligible different bowler
      batRuns: 4,
      extraRuns: 0,
      extraType: "NONE",
      shotZone: "Square Leg",
      pitchLength: "Full",
      pitchLine: "Stumps"
    });

    assert.strictEqual(res.ball.over, 1, "Ball should belong to over 1");
    assert.strictEqual(res.ball.bowlerId, playersB[9].id);
    assert.strictEqual(res.ball.isBoundaryFour, true);
  });

  await asyncTest("Wicket falls, dismissed player is marked out, incoming player is assigned", async () => {
    // Deliver wicket ball in over 1
    const res = await createBallService({
      inningsId: testInnings.id,
      batsmanId: playersA[0].id,
      nonStrikerId: playersA[1].id,
      bowlerId: playersB[9].id,
      batRuns: 0,
      extraRuns: 0,
      extraType: "NONE",
      isWicket: true,
      wicketType: "BOWLED",
      dismissedPlayerId: playersA[0].id,
      newBatsmanId: playersA[2].id, // Incoming batsman (Order 3)
      shotZone: "Point",
      pitchLength: "Yorker",
      pitchLine: "Stumps"
    });

    assert.strictEqual(res.liveScore.innings.wickets, 1, "Innings wickets count should be 1");
    assert.strictEqual(res.ball.isWicket, true);

    const dismissedScorecard = await prisma.battingScorecard.findFirst({
      where: { inningsId: testInnings.id, playerId: playersA[0].id }
    });
    assert.strictEqual(dismissedScorecard.isOut, true, "Dismissed player scorecard must have isOut = true");

    const fow = await prisma.fallOfWicket.findFirst({
      where: { inningsId: testInnings.id, playerId: playersA[0].id }
    });
    assert.ok(fow, "FallOfWicket record must exist");

    const activePart = await prisma.partnership.findFirst({
      where: { inningsId: testInnings.id, isActive: true }
    });
    assert.ok(activePart, "New active partnership must exist");
    assert.ok(
      [activePart.strikerId, activePart.nonStrikerId].includes(playersA[2].id),
      "New partnership must include incoming player"
    );
  });

  // Cleanup
  console.log("\n🧹 Cleaning up test artifacts...");
  if (testInnings?.id) {
    await prisma.ball.deleteMany({ where: { inningsId: testInnings.id } });
    await prisma.fallOfWicket.deleteMany({ where: { inningsId: testInnings.id } });
    await prisma.partnership.deleteMany({ where: { inningsId: testInnings.id } });
    await prisma.battingScorecard.deleteMany({ where: { inningsId: testInnings.id } });
    await prisma.bowlingScorecard.deleteMany({ where: { inningsId: testInnings.id } });
  }
  if (testMatch?.id) {
    await prisma.innings.deleteMany({ where: { matchId: testMatch.id } });
    await prisma.notification.deleteMany({ where: { matchId: testMatch.id } });
    await prisma.auditLog.deleteMany({ where: { entityId: testMatch.id } });
    await prisma.playingXI.deleteMany({ where: { matchId: testMatch.id } });
    await prisma.match.deleteMany({ where: { id: testMatch.id } });
  }
  if (testTeamA?.id && testTeamB?.id) {
    await prisma.player.deleteMany({ where: { teamId: { in: [testTeamA.id, testTeamB.id] } } });
    await prisma.team.deleteMany({ where: { id: { in: [testTeamA.id, testTeamB.id] } } });
  }
  if (testTournament?.id) {
    await prisma.tournament.deleteMany({ where: { id: testTournament.id } });
  }

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
