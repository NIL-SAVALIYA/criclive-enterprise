import prisma from "../config/db.js";
import { calculateBalls, buildBattingSummary } from "../engine/batting.engine.js";
import { calculateOvers, buildBowlingSummary } from "../engine/bowling.engine.js";
import { buildStrikeSummary } from "../engine/strike.engine.js";
import { calculatePoints, calculateNetRunRate } from "../engine/pointsTable.engine.js";
import { createBallService } from "../services/ball.service.js";
import { getLiveScoreService } from "../services/liveScore.service.js";
import { getScorecardService } from "../services/scorecard.service.js";
import { isNextDeliveryFreeHit } from "../engine/freeHit.engine.js";
import { resolveBattingStatus, filterDeliveredBowlers } from "../engine/scorecardStatus.engine.js";

async function runScoringLifecycleTests() {
  console.log("🏏 ===================================================");
  console.log("🏏 CRICLIVE Enterprise: Automated Scoring Engine Test");
  console.log("🏏 ===================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  console.log("\n🧪 1. Real-World Batting Engine Rules");
  {
    // Legal delivery
    const legalBalls = calculateBalls({ currentBalls: 0, isLegalDelivery: true, extraType: "NONE" });
    assert(legalBalls === 1, "Legal ball increments balls faced");

    // Wide
    const wideBalls = calculateBalls({ currentBalls: 5, isLegalDelivery: false, extraType: "WIDE" });
    assert(wideBalls === 5, "Wide does NOT increment batsman balls faced");

    // Bye & Leg Bye
    const byeBalls = calculateBalls({ currentBalls: 5, isLegalDelivery: true, extraType: "BYE" });
    assert(byeBalls === 5, "Bye does NOT increment batsman balls faced");

    const legByeBalls = calculateBalls({ currentBalls: 5, isLegalDelivery: true, extraType: "LEG_BYE" });
    assert(legByeBalls === 5, "Leg Bye does NOT increment batsman balls faced");

    // Batting Summary with 4s and 6s
    const bSummary = buildBattingSummary({
      runs: 10,
      balls: 3,
      fours: 1,
      sixes: 1,
      isOut: false
    });
    assert(bSummary.runs === 10 && bSummary.strikeRate === 333.33, "Batting strike rate calculated correctly (333.33)");
  }

  console.log("\n🧪 2. Real-World Bowling Engine Rules");
  {
    assert(calculateOvers(0) === "0.0", "0 balls = 0.0 overs");
    assert(calculateOvers(1) === "0.1", "1 ball = 0.1 overs");
    assert(calculateOvers(5) === "0.5", "5 balls = 0.5 overs");
    assert(calculateOvers(6) === "1.0", "6 balls = 1.0 overs (never 0.6)");
    assert(calculateOvers(7) === "1.1", "7 balls = 1.1 overs");

    const bowlSummary = buildBowlingSummary({
      legalBalls: 6,
      runs: 6,
      wickets: 1,
      maidens: 0,
      wides: 1,
      noBalls: 0
    });
    assert(bowlSummary.overs === "1.0", "Bowling summary overs format is 1.0");
    assert(bowlSummary.economy === 6.0, "Bowling economy is 6.00");
  }

  console.log("\n🧪 3. Strike Rotation Rules");
  {
    // Dot ball (0 runs) mid-over
    const dot = buildStrikeSummary({ strikerId: "A", nonStrikerId: "B", totalRuns: 0, overCompleted: false });
    assert(dot.strikerId === "A" && dot.nonStrikerId === "B", "Dot ball: Striker retains strike");

    // 1 run mid-over
    const single = buildStrikeSummary({ strikerId: "A", nonStrikerId: "B", totalRuns: 1, overCompleted: false });
    assert(single.strikerId === "B" && single.nonStrikerId === "A", "Single run: Striker rotates");

    // 2 runs mid-over
    const twoRuns = buildStrikeSummary({ strikerId: "A", nonStrikerId: "B", totalRuns: 2, overCompleted: false });
    assert(twoRuns.strikerId === "A" && twoRuns.nonStrikerId === "B", "Two runs: Striker retains strike");

    // 0 runs on 6th ball (over completed -> change of ends)
    const dotOverEnd = buildStrikeSummary({ strikerId: "A", nonStrikerId: "B", totalRuns: 0, overCompleted: true });
    assert(dotOverEnd.strikerId === "B" && dotOverEnd.nonStrikerId === "A", "Over end on dot: ends swap, non-striker faces next over");

    // 1 run on 6th ball (single + change of ends -> batter who took single retains strike)
    const singleOverEnd = buildStrikeSummary({ strikerId: "A", nonStrikerId: "B", totalRuns: 1, overCompleted: true });
    assert(singleOverEnd.strikerId === "A" && singleOverEnd.nonStrikerId === "B", "Over end on single: batter retains strike next over");
  }

  console.log("\n🧪 4. Points Table & NRR Engine");
  {
    const pointsWin = calculatePoints({ won: 1, tied: 0, noResult: 0 });
    assert(pointsWin === 2, "Win awards 2 points");

    const pointsTie = calculatePoints({ won: 0, tied: 1, noResult: 0 });
    assert(pointsTie === 1, "Tie awards 1 point");

    const nrr = calculateNetRunRate({
      runsScored: 150,
      ballsFaced: 120, // 20.0 overs
      runsConceded: 130,
      ballsBowled: 120 // 20.0 overs
    });
    assert(nrr === 1.0, `NRR calculation is +1.000 (got ${nrr})`);
  }

  console.log("\n🧪 5. Free-Hit & No-Ball Cricket Engine Specifications");
  {
    // Rule 1: Normal delivery does not create Free Hit
    const normalBall = isNextDeliveryFreeHit([{ isLegalDelivery: true, extraType: "NONE" }]);
    assert(normalBall === false, "Normal legal delivery does not create free hit");

    // Rule 2: No-ball delivery creates Free Hit for next delivery
    const noBallDelivery = isNextDeliveryFreeHit([{ isLegalDelivery: false, extraType: "NO_BALL" }]);
    assert(noBallDelivery === true, "No-ball delivery creates free hit for next delivery");

    // Rule 3: Next legal delivery consumes Free Hit
    const freeHitConsumed = isNextDeliveryFreeHit([
      { isLegalDelivery: true, extraType: "NONE" },
      { isLegalDelivery: false, extraType: "NO_BALL" }
    ]);
    assert(freeHitConsumed === false, "Subsequent legal delivery consumes free hit");

    // Rule 4: Consecutive no-balls keep Free Hit active
    const consecutiveNoBalls = isNextDeliveryFreeHit([
      { isLegalDelivery: false, extraType: "NO_BALL" },
      { isLegalDelivery: false, extraType: "NO_BALL" }
    ]);
    assert(consecutiveNoBalls === true, "Consecutive no-balls keep free hit active");

    // Rule 5: Wide on free hit does not consume Free Hit (remains active)
    const wideOnFreeHit = isNextDeliveryFreeHit([
      { isLegalDelivery: false, extraType: "WIDE" },
      { isLegalDelivery: false, extraType: "NO_BALL" }
    ]);
    assert(wideOnFreeHit === true, "Wide on free hit keeps free hit active for subsequent delivery");

    // Rule 6: Wide on normal delivery does not create Free Hit
    const wideOnNormal = isNextDeliveryFreeHit([
      { isLegalDelivery: false, extraType: "WIDE" },
      { isLegalDelivery: true, extraType: "NONE" }
    ]);
    assert(wideOnNormal === false, "Wide on normal delivery does not create free hit");
  }

  console.log("\n🧪 6. Batting Scorecard Status & Bowling Scorecard Visibility Rules");
  {
    // Rule 1: New innings opener 1 and 2 are NOT_OUT, remaining players are YET_TO_BAT
    const opener1Status = resolveBattingStatus({
      player: { id: "p1", battingPosition: 1, balls: 0, runs: 0, isOut: false },
      isInitialLiveInnings: true
    });
    assert(opener1Status.status === "NOT_OUT" && opener1Status.statusText === "not out", "New innings opener 1 is NOT_OUT ('not out')");

    const opener2Status = resolveBattingStatus({
      player: { id: "p2", battingPosition: 2, balls: 0, runs: 0, isOut: false },
      isInitialLiveInnings: true
    });
    assert(opener2Status.status === "NOT_OUT" && opener2Status.statusText === "not out", "New innings opener 2 is NOT_OUT ('not out')");

    const unusedPlayerStatus = resolveBattingStatus({
      player: { id: "p3", battingPosition: 3, balls: 0, runs: 0, isOut: false },
      isInitialLiveInnings: true
    });
    assert(unusedPlayerStatus.status === "YET_TO_BAT" && unusedPlayerStatus.statusText === "Yet to bat", "New innings player 3 is YET_TO_BAT ('Yet to bat')");

    // Rule 2: Batter who scored runs is NOT_OUT
    const runScorerStatus = resolveBattingStatus({
      player: { id: "p1", battingPosition: 1, balls: 10, runs: 15, isOut: false },
      participatedPlayerIds: new Set(["p1"])
    });
    assert(runScorerStatus.status === "NOT_OUT", "Batter with runs and balls is NOT_OUT");

    // Rule 3: Batter with 0 runs who is current active striker is NOT_OUT
    const activeStrikerStatus = resolveBattingStatus({
      player: { id: "p4", battingPosition: 4, balls: 0, runs: 0, isOut: false },
      activeStrikerId: "p4"
    });
    assert(activeStrikerStatus.status === "NOT_OUT", "Batter with 0 runs/balls as active striker is NOT_OUT");

    // Rule 4: Batter with 0 balls who is current active non-striker is NOT_OUT
    const activeNonStrikerStatus = resolveBattingStatus({
      player: { id: "p5", battingPosition: 5, balls: 0, runs: 0, isOut: false },
      activeNonStrikerId: "p5"
    });
    assert(activeNonStrikerStatus.status === "NOT_OUT", "Batter with 0 balls as active non-striker is NOT_OUT");

    // Rule 5: Dismissed batter shows DISMISSED with dismissal text
    const dismissedStatus = resolveBattingStatus({
      player: {
        id: "p1",
        battingPosition: 1,
        balls: 8,
        runs: 6,
        isOut: true,
        dismissalType: "BOWLED",
        bowler: { firstName: "Jasprit", lastName: "Bumrah" }
      }
    });
    assert(dismissedStatus.status === "DISMISSED" && dismissedStatus.statusText === "b Jasprit Bumrah", "Dismissed batter shows DISMISSED ('b Jasprit Bumrah')");

    // Rule 6: Player who never entered innings remains YET_TO_BAT
    const neverEnteredStatus = resolveBattingStatus({
      player: { id: "p6", battingPosition: 6, balls: 0, runs: 0, isOut: false },
      participatedPlayerIds: new Set(["p1", "p2", "p4", "p5"])
    });
    assert(neverEnteredStatus.status === "YET_TO_BAT", "Player who never entered remains YET_TO_BAT");

    // Rule 7: Player who previously entered (faced balls) but scored 0 runs is NOT_OUT
    const zeroRunParticipantStatus = resolveBattingStatus({
      player: { id: "p2", battingPosition: 2, balls: 3, runs: 0, isOut: false },
      participatedPlayerIds: new Set(["p1", "p2"])
    });
    assert(zeroRunParticipantStatus.status === "NOT_OUT", "Player who faced balls but has 0 runs is NOT_OUT");

    // Rule 8: Bowling filter - No balls bowled returns empty list
    const emptyBowling = filterDeliveredBowlers([
      { bowlerId: "b1", balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 },
      { bowlerId: "b2", balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 }
    ], []);
    assert(emptyBowling.length === 0, "Bowling filter returns 0 bowlers when no balls have been bowled");

    // Rule 9: Bowling filter - Only bowlers who delivered appear
    const activeBowling = filterDeliveredBowlers([
      { bowlerId: "b1", balls: 6, runs: 4, wickets: 1, wides: 0, noBalls: 0 },
      { bowlerId: "b2", balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 }
    ], [{ bowlerId: "b1" }]);
    assert(activeBowling.length === 1 && activeBowling[0].bowlerId === "b1", "Bowling filter includes only bowlers who delivered at least 1 ball");

    // Rule 10: Bowler with 0 runs conceded but 1 ball delivered still appears
    const maidenBallBowler = filterDeliveredBowlers([
      { bowlerId: "b3", balls: 1, runs: 0, wickets: 0, wides: 0, noBalls: 0 }
    ], [{ bowlerId: "b3" }]);
    assert(maidenBallBowler.length === 1, "Bowler with 0 runs but 1 ball delivered appears in scorecard");
  }

  console.log("\n🧪 7. End-to-End Database Match & Ball Scoring Lifecycle");
  try {
    // Warmup / connect with retry
    let connected = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        connected = true;
        break;
      } catch {
        console.log(`Connecting to database (attempt ${attempt}/3)...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!connected) {
      throw new Error("Unable to establish connection to database.");
    }

    const timestamp = Date.now();
    // 1. Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        name: `Test Premier League ${timestamp}`,
        format: "LEAGUE",
        startDate: new Date(),
        endDate: new Date()
      }
    });

    // 2. Create 2 teams
    const teamA = await prisma.team.create({
      data: { name: `Team Titans ${timestamp}`, shortName: `TT${timestamp.toString().slice(-4)}`, city: "Mumbai" }
    });
    const teamB = await prisma.team.create({
      data: { name: `Team Warriors ${timestamp}`, shortName: `TW${timestamp.toString().slice(-4)}`, city: "Delhi" }
    });

    // Register teams to tournament
    await prisma.tournamentTeam.createMany({
      data: [
        { tournamentId: tournament.id, teamId: teamA.id },
        { tournamentId: tournament.id, teamId: teamB.id }
      ]
    });

    // Initialize points table
    await prisma.pointsTable.createMany({
      data: [
        { tournamentId: tournament.id, teamId: teamA.id },
        { tournamentId: tournament.id, teamId: teamB.id }
      ]
    });

    // 3. Create players for Team A & B
    const playerA1 = await prisma.player.create({
      data: { firstName: "Rohit", lastName: "Sharma", playerType: "BATSMAN", teamId: teamA.id }
    });
    const playerA2 = await prisma.player.create({
      data: { firstName: "Virat", lastName: "Kohli", playerType: "BATSMAN", teamId: teamA.id }
    });
    const playerA3 = await prisma.player.create({
      data: { firstName: "Suryakumar", lastName: "Yadav", playerType: "BATSMAN", teamId: teamA.id }
    });

    const playerB1 = await prisma.player.create({
      data: { firstName: "Jasprit", lastName: "Bumrah", playerType: "BOWLER", teamId: teamB.id }
    });
    const playerB2 = await prisma.player.create({
      data: { firstName: "Mohammed", lastName: "Shami", playerType: "BOWLER", teamId: teamB.id }
    });
    const playerB3 = await prisma.player.create({
      data: { firstName: "KL", lastName: "Rahul", playerType: "BATSMAN", teamId: teamB.id }
    });

    // 4. Create match
    const match = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        venue: "Wankhede Stadium",
        matchDate: new Date(),
        status: "LIVE"
      }
    });

    // Register Playing XI
    await prisma.playingXI.createMany({
      data: [
        { matchId: match.id, teamId: teamA.id, playerId: playerA1.id, battingOrder: 1 },
        { matchId: match.id, teamId: teamA.id, playerId: playerA2.id, battingOrder: 2 },
        { matchId: match.id, teamId: teamA.id, playerId: playerA3.id, battingOrder: 3 },
        { matchId: match.id, teamId: teamB.id, playerId: playerB1.id, battingOrder: 1 },
        { matchId: match.id, teamId: teamB.id, playerId: playerB2.id, battingOrder: 2 },
        { matchId: match.id, teamId: teamB.id, playerId: playerB3.id, battingOrder: 3 }
      ]
    });

    // 5. Create 1st Innings
    const innings1 = await prisma.innings.create({
      data: {
        matchId: match.id,
        inningsNumber: 1,
        battingTeamId: teamA.id,
        bowlingTeamId: teamB.id,
        status: "LIVE"
      }
    });

    // Create scorecards
    await prisma.battingScorecard.createMany({
      data: [
        { inningsId: innings1.id, playerId: playerA1.id, battingPosition: 1 },
        { inningsId: innings1.id, playerId: playerA2.id, battingPosition: 2 },
        { inningsId: innings1.id, playerId: playerA3.id, battingPosition: 3 }
      ]
    });

    await prisma.bowlingScorecard.createMany({
      data: [
        { inningsId: innings1.id, bowlerId: playerB1.id },
        { inningsId: innings1.id, bowlerId: playerB2.id }
      ]
    });

    // Ball 1: 4 runs (FOUR)
    const ball1Res = await createBallService({
      inningsId: innings1.id,
      batsmanId: playerA1.id,
      nonStrikerId: playerA2.id,
      bowlerId: playerB1.id,
      batRuns: 4,
      extraRuns: 0,
      extraType: "NONE",
      shotZone: "Cover"
    });
    assert(ball1Res.liveScore.innings.runs === 4, "Ball 1: Team total is 4 runs");
    assert(ball1Res.liveScore.batting.fours === 1, "Ball 1: Rohit has 1 FOUR");

    // Ball 2: WIDE (+1 extra run, no legal ball)
    const ball2Res = await createBallService({
      inningsId: innings1.id,
      batsmanId: playerA1.id,
      nonStrikerId: playerA2.id,
      bowlerId: playerB1.id,
      batRuns: 0,
      extraRuns: 1,
      extraType: "WIDE"
    });
    assert(ball2Res.liveScore.innings.runs === 5, "Ball 2 (Wide): Team total is 5 runs");
    assert(ball2Res.liveScore.innings.legalBalls === 1, "Ball 2 (Wide): Legal balls remains 1");

    // Ball 3: 1 run (Strike rotates to Kohli)
    const ball3Res = await createBallService({
      inningsId: innings1.id,
      batsmanId: playerA1.id,
      nonStrikerId: playerA2.id,
      bowlerId: playerB1.id,
      batRuns: 1,
      extraRuns: 0,
      extraType: "NONE"
    });
    assert(ball3Res.liveScore.strike.strikerId === playerA2.id, "Ball 3 (Single): Strike rotated to playerA2");

    // Ball 4: Wicket (Kohli out bowled, Suryakumar comes in)
    const ball4Res = await createBallService({
      inningsId: innings1.id,
      batsmanId: playerA2.id,
      nonStrikerId: playerA1.id,
      bowlerId: playerB1.id,
      batRuns: 0,
      extraRuns: 0,
      extraType: "NONE",
      isWicket: true,
      wicketType: "BOWLED",
      dismissedPlayerId: playerA2.id,
      newBatsmanId: playerA3.id
    });
    assert(ball4Res.liveScore.innings.wickets === 1, "Ball 4 (Wicket): Innings wickets count is 1");

    // 🧪 6. Free Hit & No-Ball Rules Verification
    // Ball 5: Bowler delivers NO-BALL (+1 run, Free-Hit triggered for next delivery)
    const ball5Res = await createBallService({
      inningsId: innings1.id,
      batsmanId: playerA3.id,
      nonStrikerId: playerA1.id,
      bowlerId: playerB1.id,
      batRuns: 0,
      extraRuns: 1,
      extraType: "NO_BALL"
    });
    assert(ball5Res.liveScore.freeHitNextDelivery === true, "Ball 5 (No-Ball): Free Hit is active for next delivery");
    assert(ball5Res.liveScore.bowling.noBalls === 1, "Ball 5 (No-Ball): Bowler noBalls count incremented to 1");

    // Ball 6: Second consecutive NO-BALL (Free-Hit remains active, Bowler noBalls becomes 2)
    const ball6Res = await createBallService({
      inningsId: innings1.id,
      batsmanId: playerA3.id,
      nonStrikerId: playerA1.id,
      bowlerId: playerB1.id,
      batRuns: 0,
      extraRuns: 1,
      extraType: "NO_BALL"
    });
    assert(ball6Res.liveScore.freeHitNextDelivery === true, "Ball 6 (Consecutive No-Ball): Free Hit remains active for next delivery");
    assert(ball6Res.liveScore.bowling.noBalls === 2, "Ball 6 (Consecutive No-Ball): Bowler noBalls count incremented to 2");

    // Ball 7: Free-Hit delivery with 4 normal runs (Free-Hit consumed, delivery is legal, extraType is NONE)
    const ball7Res = await createBallService({
      inningsId: innings1.id,
      batsmanId: playerA3.id,
      nonStrikerId: playerA1.id,
      bowlerId: playerB1.id,
      batRuns: 4,
      extraRuns: 0,
      extraType: "NONE"
    });
    assert(ball7Res.liveScore.freeHitNextDelivery === false, "Ball 7 (Free-Hit Consumed): Free Hit state deactivated after legal ball");
    assert(ball7Res.liveScore.batting.runs === 4, "Ball 7 (Free-Hit Delivery): 4 runs credited to batsman");
    assert(ball7Res.liveScore.bowling.noBalls === 2, "Ball 7 (Legal Delivery): Bowler noBalls count remained 2");

    // Test LiveScore and Scorecard API services
    const liveScoreData = await getLiveScoreService(match.id);
    assert(liveScoreData.score.runs === 12, `Live score API returns correct total runs (12)`);
    assert(liveScoreData.isFreeHit === false, "Live score API confirms free hit is not active after consumption");
    assert(liveScoreData.currentBowling.noBalls === 2, "Live score API confirms bowler noBalls count is 2");
    assert(liveScoreData.matchStatus === "First Innings", "Live score API returns 'First Innings'");

    const scorecardData = await getScorecardService(match.id);
    assert(scorecardData.batting.length === 3, "Scorecard API returns batting scorecard entries");
    
    const rohitCard = scorecardData.batting.find(b => b.id === playerA1.id);
    const kohliCard = scorecardData.batting.find(b => b.id === playerA2.id);
    const suryaCard = scorecardData.batting.find(b => b.id === playerA3.id);

    assert(rohitCard?.status === "NOT_OUT" && rohitCard?.statusText === "not out", "Rohit is NOT_OUT ('not out') in scorecard");
    assert(kohliCard?.status === "DISMISSED", "Kohli is DISMISSED in scorecard");
    assert(suryaCard?.status === "NOT_OUT" && suryaCard?.statusText === "not out", "Suryakumar is NOT_OUT ('not out') in scorecard");

    assert(scorecardData.bowling.length === 1, "Scorecard API returns ONLY delivered bowlers (1 bowler who actually bowled)");
    assert(scorecardData.allBowlers.length === 2, "Scorecard API returns all team bowlers in allBowlers");
    const bumrahScorecard = scorecardData.bowling.find(b => b.id === playerB1.id);
    assert(bumrahScorecard?.noBalls === 2, "Scorecard API returns bowler noBalls count of 2");

    // Clean up test data
    await prisma.ball.deleteMany({ where: { inningsId: innings1.id } });
    await prisma.fallOfWicket.deleteMany({ where: { inningsId: innings1.id } });
    await prisma.partnership.deleteMany({ where: { inningsId: innings1.id } });
    await prisma.battingScorecard.deleteMany({ where: { inningsId: innings1.id } });
    await prisma.bowlingScorecard.deleteMany({ where: { inningsId: innings1.id } });
    await prisma.innings.deleteMany({ where: { matchId: match.id } });
    await prisma.playingXI.deleteMany({ where: { matchId: match.id } });
    await prisma.pointsTable.deleteMany({ where: { tournamentId: tournament.id } });
    await prisma.match.deleteMany({ where: { id: match.id } });
    await prisma.tournamentTeam.deleteMany({ where: { tournamentId: tournament.id } });
    await prisma.player.deleteMany({ where: { teamId: { in: [teamA.id, teamB.id] } } });
    await prisma.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id] } } });
    await prisma.tournament.deleteMany({ where: { id: tournament.id } });

    assert(true, "End-to-End simulation and database cleanup completed successfully");
  } catch (err) {
    console.error("❌ E2E Simulation Error:", err);
    failed++;
  }

  console.log(`\n===================================================`);
  console.log(`📊 Lifecycle Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`===================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runScoringLifecycleTests();
