import assert from "node:assert";
import prisma from "../config/db.js";
import {
  startFootballMatchService,
  getFootballMatchStateService,
  getFootballEventsService,
  recordGoalService,
  recordCardService,
  recordSubstitutionService,
  recordPenaltyService,
  recordKickoffService,
  recordHalfTimeService,
  startSecondHalfService,
  recordFullTimeService,
  undoFootballEventService,
  validateFootballMatch
} from "../services/footballMatch.service.js";
import { startMatch } from "../services/startMatch.service.js";
import { createToss } from "../services/toss.service.js";
import { recordBadmintonPointService } from "../services/badmintonMatch.service.js";
import { getLiveMatchService } from "../services/liveMatch.service.js";
import { getScorecardService } from "../services/scorecard.service.js";
import crypto from "crypto";

async function runE2EFootballLifecycleTests() {
  console.log("\n🧪 Running CRICLIVE Phase 5: Football Complete E2E Lifecycle & Validation Suite...\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}:`, err.message);
      failed++;
    }
  }

  const ts = Date.now();

  // 1. Ensure Sports exist
  const footballSport = await prisma.sport.upsert({
    where: { code: "FOOTBALL" },
    update: {},
    create: { code: "FOOTBALL", name: "Football", isActive: true }
  });

  const cricketSport = await prisma.sport.upsert({
    where: { code: "CRICKET" },
    update: {},
    create: { code: "CRICKET", name: "Cricket", isActive: true }
  });

  const badmintonSport = await prisma.sport.upsert({
    where: { code: "BADMINTON" },
    update: {},
    create: { code: "BADMINTON", name: "Badminton", isActive: true }
  });

  // 2. Football Tournament Creation & Association
  let fbTournament;
  let fbTeamA;
  let fbTeamB;
  let fbPlayerA1;
  let fbPlayerA2;
  let fbPlayerB1;
  let fbPlayerB2;
  let fbMatch;
  let cricketMatch;
  let badmintonMatch;

  await test("2. Football Tournament: Create tournament, associate teams, and verify zero cricket fields", async () => {
    fbTournament = await prisma.tournament.create({
      data: {
        name: `UEFA Champions League ${ts}`,
        format: "LEAGUE",
        startDate: new Date(),
        endDate: new Date(),
        sportId: footballSport.id
      },
      include: { sport: true }
    });

    assert.equal(fbTournament.sport.code, "FOOTBALL");

    // Create Football Teams
    fbTeamA = await prisma.team.create({
      data: { name: `Real Madrid ${ts}`, shortName: `RMA${ts.toString().slice(-3)}`, city: "Madrid", sportId: footballSport.id }
    });
    fbTeamB = await prisma.team.create({
      data: { name: `Bayern Munich ${ts}`, shortName: `BAY${ts.toString().slice(-3)}`, city: "Munich", sportId: footballSport.id }
    });

    // Create Players
    fbPlayerA1 = await prisma.player.create({
      data: { firstName: "Vinicius", lastName: "Junior", jerseyNumber: 7, teamId: fbTeamA.id, sportId: footballSport.id }
    });
    fbPlayerA2 = await prisma.player.create({
      data: { firstName: "Luka", lastName: "Modric", jerseyNumber: 10, teamId: fbTeamA.id, sportId: footballSport.id }
    });
    fbPlayerB1 = await prisma.player.create({
      data: { firstName: "Harry", lastName: "Kane", jerseyNumber: 9, teamId: fbTeamB.id, sportId: footballSport.id }
    });
    fbPlayerB2 = await prisma.player.create({
      data: { firstName: "Jamal", lastName: "Musiala", jerseyNumber: 42, teamId: fbTeamB.id, sportId: footballSport.id }
    });

    // Associate Teams to Tournament
    await prisma.tournamentTeam.createMany({
      data: [
        { tournamentId: fbTournament.id, teamId: fbTeamA.id },
        { tournamentId: fbTournament.id, teamId: fbTeamB.id }
      ]
    });

    const registered = await prisma.tournamentTeam.findMany({
      where: { tournamentId: fbTournament.id },
      include: { team: true }
    });
    assert.equal(registered.length, 2);
  });

  // 3. Football Match Creation & State Isolation Check
  await test("3. Football Match: Create match with scoring token, verify zero cricket innings and zero badminton state", async () => {
    const scoringToken = crypto.randomBytes(16).toString("hex");

    fbMatch = await prisma.match.create({
      data: {
        tournamentId: fbTournament.id,
        teamAId: fbTeamA.id,
        teamBId: fbTeamB.id,
        venue: "Santiago Bernabeu",
        matchDate: new Date(),
        status: "UPCOMING",
        scoringToken
      },
      include: {
        tournament: { include: { sport: true } },
        teamA: true,
        teamB: true,
        innings: true,
        badmintonMatchState: true,
        footballMatchState: true
      }
    });

    assert.equal(fbMatch.tournament.sport.code, "FOOTBALL");
    assert.equal(fbMatch.innings.length, 0, "Football match must have ZERO cricket innings");
    assert.equal(fbMatch.badmintonMatchState, null, "Football match must have NULL badmintonMatchState");
    assert.equal(fbMatch.status, "UPCOMING");
  });

  // 4. Complete Scoring Lifecycle Flow
  await test("4. Football Scoring Lifecycle: UPCOMING ➔ KICKOFF ➔ GOAL ➔ YELLOW CARD ➔ SUB ➔ PENALTY ➔ HT ➔ 2ND HALF ➔ GOAL ➔ RED CARD ➔ FT", async () => {
    // Step A: KICKOFF (Start match)
    const startRes = await startFootballMatchService(fbMatch.id, { kickoffTeamId: fbTeamA.id });
    assert.equal(startRes.matchState.homeScore, 0);
    assert.equal(startRes.matchState.awayScore, 0);
    assert.equal(startRes.matchState.currentHalf, 1);
    assert.equal(startRes.matchState.status, "LIVE");
    assert.equal(startRes.events.length, 1);
    assert.equal(startRes.events[0].eventType, "KICKOFF");

    // Step B: GOAL (Home team scores)
    const goal1 = await recordGoalService(fbMatch.id, {
      scoringTeamId: fbTeamA.id,
      playerId: fbPlayerA1.id,
      secondaryPlayerId: fbPlayerA2.id,
      minute: 23,
      detail: "Curling shot into top corner"
    });
    assert.equal(goal1.matchState.homeScore, 1);
    assert.equal(goal1.matchState.awayScore, 0);
    assert.equal(goal1.event.eventType, "GOAL");
    assert.equal(goal1.event.playerId, fbPlayerA1.id);
    assert.equal(goal1.event.secondaryPlayerId, fbPlayerA2.id);

    // Step C: YELLOW CARD (Away team receives yellow card)
    const card1 = await recordCardService(fbMatch.id, {
      cardType: "YELLOW_CARD",
      teamId: fbTeamB.id,
      playerId: fbPlayerB1.id,
      minute: 31,
      detail: "Dissent"
    });
    assert.equal(card1.matchState.homeScore, 1);
    assert.equal(card1.matchState.awayScore, 0);
    assert.equal(card1.event.eventType, "YELLOW_CARD");

    // Step D: SUBSTITUTION (Home team substitution)
    const sub1 = await recordSubstitutionService(fbMatch.id, {
      teamId: fbTeamA.id,
      playerLeavingId: fbPlayerA2.id,
      playerEnteringId: "sub-fresh-legs-1",
      minute: 40,
      detail: "Tactical replacement"
    });
    assert.equal(sub1.event.eventType, "SUBSTITUTION");
    assert.equal(sub1.event.playerId, fbPlayerA2.id);
    assert.equal(sub1.event.secondaryPlayerId, "sub-fresh-legs-1");

    // Step E: PENALTY (Away team misses penalty)
    const pen1 = await recordPenaltyService(fbMatch.id, {
      teamId: fbTeamB.id,
      playerId: fbPlayerB1.id,
      minute: 44,
      isScored: false,
      detail: "Hit the crossbar"
    });
    assert.equal(pen1.event.eventType, "PENALTY");
    assert.equal(pen1.matchState.homeScore, 1);
    assert.equal(pen1.matchState.awayScore, 0); // No score mutation for missed penalty

    // Step F: HALF TIME
    const ht = await recordHalfTimeService(fbMatch.id, { minute: 45 });
    assert.equal(ht.event.eventType, "HALF_TIME");
    assert.equal(ht.matchState.currentHalf, 1);

    // Step G: SECOND HALF (Starts half 2)
    const sh = await startSecondHalfService(fbMatch.id, { minute: 45 });
    assert.equal(sh.matchState.currentHalf, 2);
    assert.equal(sh.event.eventType, "KICKOFF");

    // Step H: GOAL (Away team scores equalizer)
    const goal2 = await recordGoalService(fbMatch.id, {
      scoringTeamId: fbTeamB.id,
      playerId: fbPlayerB2.id,
      minute: 68,
      detail: "Low drive past goalkeeper"
    });
    assert.equal(goal2.matchState.homeScore, 1);
    assert.equal(goal2.matchState.awayScore, 1);
    assert.equal(goal2.event.eventType, "GOAL");

    // Step I: RED CARD (Away team red card)
    const card2 = await recordCardService(fbMatch.id, {
      cardType: "RED_CARD",
      teamId: fbTeamB.id,
      playerId: fbPlayerB1.id,
      minute: 82,
      detail: "Second yellow resulting in red"
    });
    assert.equal(card2.event.eventType, "RED_CARD");
    assert.equal(card2.matchState.homeScore, 1);
    assert.equal(card2.matchState.awayScore, 1);

    // Step J: FULL TIME (Ends match)
    const ft = await recordFullTimeService(fbMatch.id, { minute: 90 });
    assert.equal(ft.matchState.status, "COMPLETED");
    assert.equal(ft.match.status, "COMPLETED");
    assert.ok(ft.match.result.includes("drawn 1-1"));
    assert.equal(ft.event.eventType, "FULL_TIME");

    // Verify timeline count
    const finalTimeline = await getFootballEventsService(fbMatch.id);
    assert.equal(finalTimeline.events.length, 10);
  });

  // 5. Undo Validation
  await test("5. Undo: Undo full-time whistle re-opens match to LIVE, undo goal decrements score correctly", async () => {
    // Undo FT
    const undoFt = await undoFootballEventService(fbMatch.id);
    assert.equal(undoFt.matchState.status, "LIVE");
    assert.equal(undoFt.undoneEvent.eventType, "FULL_TIME");

    // Undo Red Card
    const undoCard = await undoFootballEventService(fbMatch.id);
    assert.equal(undoCard.undoneEvent.eventType, "RED_CARD");
    assert.equal(undoCard.matchState.homeScore, 1);
    assert.equal(undoCard.matchState.awayScore, 1);

    // Undo Goal (Away team 1-1 goal)
    const undoGoal = await undoFootballEventService(fbMatch.id);
    assert.equal(undoGoal.undoneEvent.eventType, "GOAL");
    assert.equal(undoGoal.matchState.awayScore, 0); // Reverted to 0!
    assert.equal(undoGoal.matchState.homeScore, 1);
  });

  // 6. Live Match Center Data Verification
  await test("6. Live Match Center & Scorecard: Returns Football structure with zero cricket or badminton fields", async () => {
    const live = await getLiveMatchService(fbMatch.id);
    assert.equal(live.sport, "FOOTBALL");
    assert.ok(live.matchState);
    assert.equal(live.matchState.homeScore, 1);
    assert.equal(live.matchState.awayScore, 0);
    assert.equal(live.currentInnings, undefined);
    assert.equal(live.runs, undefined);
    assert.equal(live.overs, undefined);
    assert.equal(live.wickets, undefined);
    assert.equal(live.badmintonMatchState, undefined);

    const scorecard = await getScorecardService(fbMatch.id);
    assert.equal(scorecard.sport, "FOOTBALL");
    assert.ok(scorecard.match);
    assert.ok(scorecard.matchState);
    assert.ok(scorecard.events);
    assert.equal(scorecard.innings, undefined);
    assert.equal(scorecard.battingScorecards, undefined);
    assert.equal(scorecard.bowlingScorecards, undefined);
  });

  // 7. Dedicated Scoring Link Resolution
  await test("7. Dedicated Scoring Link: Session token detects FOOTBALL sport cleanly", async () => {
    const matchWithToken = await prisma.match.findUnique({
      where: { scoringToken: fbMatch.scoringToken },
      include: {
        tournament: {
          include: { sport: true }
        },
        teamA: true,
        teamB: true
      }
    });

    assert.ok(matchWithToken);
    assert.equal(matchWithToken.tournament.sport.code, "FOOTBALL");
    assert.notEqual(matchWithToken.tournament.sport.code, "CRICKET");
    assert.notEqual(matchWithToken.tournament.sport.code, "BADMINTON");
  });

  // 8. Cross-Sport Rejection Tests
  await test("8. Cross-Sport Rejections: 4-way rejection matrix throws HTTP 400 with descriptive error messages", async () => {
    // Create temporary Cricket and Badminton matches
    const cTourney = await prisma.tournament.create({
      data: { name: `Cricket Tourney ${ts}`, format: "LEAGUE", startDate: new Date(), endDate: new Date(), sportId: cricketSport.id }
    });
    const cTeamA = await prisma.team.create({
      data: { name: `Team CA ${ts}`, shortName: `CA${ts.toString().slice(-3)}`, city: "City CA", sportId: cricketSport.id }
    });
    const cTeamB = await prisma.team.create({
      data: { name: `Team CB ${ts}`, shortName: `CB${ts.toString().slice(-3)}`, city: "City CB", sportId: cricketSport.id }
    });
    cricketMatch = await prisma.match.create({
      data: { tournamentId: cTourney.id, teamAId: cTeamA.id, teamBId: cTeamB.id, venue: "Cricket Grounds", matchDate: new Date() }
    });

    const bTourney = await prisma.tournament.create({
      data: { name: `Badminton Tourney ${ts}`, format: "KNOCKOUT", startDate: new Date(), endDate: new Date(), sportId: badmintonSport.id }
    });
    const bTeamA = await prisma.team.create({
      data: { name: `Team BA ${ts}`, shortName: `BA${ts.toString().slice(-3)}`, city: "City BA", sportId: badmintonSport.id }
    });
    const bTeamB = await prisma.team.create({
      data: { name: `Team BB ${ts}`, shortName: `BB${ts.toString().slice(-3)}`, city: "City BB", sportId: badmintonSport.id }
    });
    badmintonMatch = await prisma.match.create({
      data: { tournamentId: bTourney.id, teamAId: bTeamA.id, teamBId: bTeamB.id, venue: "Badminton Hall", matchDate: new Date() }
    });

    // 1. Cricket operation on Football match -> 400
    let cOnF = false;
    try {
      await startMatch(fbMatch.id, "d1", "d2", "d3");
    } catch (err) {
      cOnF = true;
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("FOOTBALL"));
    }
    assert.equal(cOnF, true, "Cricket startMatch on Football match must be rejected");

    let cTossOnF = false;
    try {
      await createToss(fbMatch.id, fbTeamA.id, "BAT");
    } catch (err) {
      cTossOnF = true;
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("FOOTBALL"));
    }
    assert.equal(cTossOnF, true, "Cricket createToss on Football match must be rejected");

    // 2. Badminton operation on Football match -> 400
    let bOnF = false;
    try {
      await recordBadmintonPointService(fbMatch.id, { scoringTeamId: fbTeamA.id });
    } catch (err) {
      bOnF = true;
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("FOOTBALL"));
    }
    assert.equal(bOnF, true, "Badminton point on Football match must be rejected");

    // 3. Football operation on Cricket match -> 400
    let fOnC = false;
    try {
      await recordGoalService(cricketMatch.id, { scoringTeamId: cTeamA.id, minute: 15 });
    } catch (err) {
      fOnC = true;
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("CRICKET"));
    }
    assert.equal(fOnC, true, "Football goal on Cricket match must be rejected");

    // 4. Football operation on Badminton match -> 400
    let fOnB = false;
    try {
      await recordGoalService(badmintonMatch.id, { scoringTeamId: bTeamA.id, minute: 15 });
    } catch (err) {
      fOnB = true;
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("BADMINTON"));
    }
    assert.equal(fOnB, true, "Football goal on Badminton match must be rejected");
  });

  // Cleanup
  const tourneyIds = [fbTournament?.id, cricketMatch?.tournamentId, badmintonMatch?.tournamentId].filter(Boolean);
  await prisma.tournamentTeam.deleteMany({
    where: { tournamentId: { in: tourneyIds } }
  });
  await prisma.match.deleteMany({
    where: { id: { in: [fbMatch?.id, cricketMatch?.id, badmintonMatch?.id].filter(Boolean) } }
  });
  await prisma.tournament.deleteMany({
    where: { id: { in: tourneyIds } }
  });

  console.log(`\n========================================`);
  console.log(`E2E FOOTBALL LIFECYCLE TESTS: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runE2EFootballLifecycleTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
