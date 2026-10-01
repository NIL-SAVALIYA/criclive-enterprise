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
  undoFootballEventService
} from "../services/footballMatch.service.js";
import { startMatch } from "../services/startMatch.service.js";
import { createToss } from "../services/toss.service.js";
import { recordBadmintonPointService } from "../services/badmintonMatch.service.js";
import { getLiveMatchService } from "../services/liveMatch.service.js";
import { getScorecardService } from "../services/scorecard.service.js";

async function runFootballSportIsolationTests() {
  console.log("\n🧪 Running CRICLIVE Football Engine & Sport Isolation Test Suite...\n");

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

  // Setup: Create Sports, Tournaments, Teams and Matches for Cricket, Badminton, and Football
  const ts = Date.now();

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

  // Tournaments
  const footballTournament = await prisma.tournament.create({
    data: {
      name: `Premier League ${ts}`,
      format: "LEAGUE",
      startDate: new Date(),
      endDate: new Date(),
      sportId: footballSport.id
    }
  });

  const cricketTournament = await prisma.tournament.create({
    data: {
      name: `IPL ${ts}`,
      format: "LEAGUE",
      startDate: new Date(),
      endDate: new Date(),
      sportId: cricketSport.id
    }
  });

  const badmintonTournament = await prisma.tournament.create({
    data: {
      name: `All England Open ${ts}`,
      format: "KNOCKOUT",
      startDate: new Date(),
      endDate: new Date(),
      sportId: badmintonSport.id
    }
  });

  // Teams
  const fbTeamA = await prisma.team.create({
    data: { name: `Arsenal ${ts}`, shortName: `ARS${ts.toString().slice(-3)}`, city: "London", sportId: footballSport.id }
  });
  const fbTeamB = await prisma.team.create({
    data: { name: `Chelsea ${ts}`, shortName: `CHE${ts.toString().slice(-3)}`, city: "London", sportId: footballSport.id }
  });
  const fbOtherTeam = await prisma.team.create({
    data: { name: `Liverpool ${ts}`, shortName: `LIV${ts.toString().slice(-3)}`, city: "Liverpool", sportId: footballSport.id }
  });

  const cTeamA = await prisma.team.create({
    data: { name: `Mumbai Stars ${ts}`, shortName: `MS${ts.toString().slice(-3)}`, city: "Mumbai", sportId: cricketSport.id }
  });
  const cTeamB = await prisma.team.create({
    data: { name: `Chennai Knights ${ts}`, shortName: `CK${ts.toString().slice(-3)}`, city: "Chennai", sportId: cricketSport.id }
  });

  const bTeamA = await prisma.team.create({
    data: { name: `Smashers ${ts}`, shortName: `SM${ts.toString().slice(-3)}`, city: "Hyderabad", sportId: badmintonSport.id }
  });
  const bTeamB = await prisma.team.create({
    data: { name: `Shuttlers ${ts}`, shortName: `SH${ts.toString().slice(-3)}`, city: "Bengaluru", sportId: badmintonSport.id }
  });

  // Matches
  const footballMatch = await prisma.match.create({
    data: {
      tournamentId: footballTournament.id,
      teamAId: fbTeamA.id,
      teamBId: fbTeamB.id,
      venue: "Emirates Stadium",
      matchDate: new Date()
    }
  });

  const cricketMatch = await prisma.match.create({
    data: {
      tournamentId: cricketTournament.id,
      teamAId: cTeamA.id,
      teamBId: cTeamB.id,
      venue: "Wankhede Stadium",
      matchDate: new Date()
    }
  });

  const badmintonMatch = await prisma.match.create({
    data: {
      tournamentId: badmintonTournament.id,
      teamAId: bTeamA.id,
      teamBId: bTeamB.id,
      venue: "National Badminton Center",
      matchDate: new Date()
    }
  });

  try {
    // 1. Football match initialization
    await test("1. Football match initialization creates state with 0-0 and KICKOFF event", async () => {
      const res = await startFootballMatchService(footballMatch.id);
      assert.equal(res.matchState.homeScore, 0);
      assert.equal(res.matchState.awayScore, 0);
      assert.equal(res.matchState.currentHalf, 1);
      assert.equal(res.matchState.status, "LIVE");
      assert.equal(res.events.length, 1);
      assert.equal(res.events[0].eventType, "KICKOFF");
    });

    // 2. Goal for home team
    await test("2. Goal for home team increments homeScore", async () => {
      const res = await recordGoalService(footballMatch.id, {
        scoringTeamId: fbTeamA.id,
        minute: 12,
        detail: "Right foot volley"
      });
      assert.equal(res.matchState.homeScore, 1);
      assert.equal(res.matchState.awayScore, 0);
      assert.equal(res.event.eventType, "GOAL");
      assert.equal(res.event.teamId, fbTeamA.id);
      assert.equal(res.event.minute, 12);
    });

    // 3. Goal for away team
    await test("3. Goal for away team increments awayScore", async () => {
      const res = await recordGoalService(footballMatch.id, {
        scoringTeamId: fbTeamB.id,
        minute: 25,
        detail: "Counter-attack finish"
      });
      assert.equal(res.matchState.homeScore, 1);
      assert.equal(res.matchState.awayScore, 1);
      assert.equal(res.event.eventType, "GOAL");
      assert.equal(res.event.teamId, fbTeamB.id);
    });

    // 4. Goal event stored in timeline
    await test("4. Goal events stored in timeline with correct detail and minutes", async () => {
      const res = await getFootballEventsService(footballMatch.id);
      const goals = res.events.filter(e => e.eventType === "GOAL");
      assert.equal(goals.length, 2);
      assert.equal(goals[0].minute, 12);
      assert.equal(goals[1].minute, 25);
    });

    // 5. Yellow card event
    await test("5. Yellow card event recorded without mutating score", async () => {
      const res = await recordCardService(footballMatch.id, {
        cardType: "YELLOW_CARD",
        teamId: fbTeamA.id,
        minute: 31,
        detail: "Tactical foul"
      });
      assert.equal(res.matchState.homeScore, 1);
      assert.equal(res.matchState.awayScore, 1);
      assert.equal(res.event.eventType, "YELLOW_CARD");
      assert.equal(res.event.teamId, fbTeamA.id);
    });

    // 6. Red card event
    await test("6. Red card event recorded without mutating score", async () => {
      const res = await recordCardService(footballMatch.id, {
        cardType: "RED_CARD",
        teamId: fbTeamB.id,
        minute: 38,
        detail: "Serious foul play"
      });
      assert.equal(res.matchState.homeScore, 1);
      assert.equal(res.matchState.awayScore, 1);
      assert.equal(res.event.eventType, "RED_CARD");
      assert.equal(res.event.teamId, fbTeamB.id);
    });

    // 7. Substitution event
    await test("7. Substitution event stores player leaving and entering", async () => {
      const res = await recordSubstitutionService(footballMatch.id, {
        teamId: fbTeamA.id,
        playerLeavingId: "dummy-leaving-p1",
        playerEnteringId: "dummy-entering-p2",
        minute: 42,
        detail: "Tactical substitution"
      });
      assert.equal(res.event.eventType, "SUBSTITUTION");
      assert.equal(res.event.playerId, "dummy-leaving-p1");
      assert.equal(res.event.secondaryPlayerId, "dummy-entering-p2");
      assert.equal(res.matchState.homeScore, 1);
      assert.equal(res.matchState.awayScore, 1);
    });

    // 8. Penalty event
    await test("8. Penalty event (missed/saved) does NOT mutate score; successful penalty increments score", async () => {
      // Missed penalty
      const missedRes = await recordPenaltyService(footballMatch.id, {
        teamId: fbTeamB.id,
        minute: 44,
        isScored: false,
        detail: "Penalty saved by goalkeeper"
      });
      assert.equal(missedRes.event.eventType, "PENALTY");
      assert.equal(missedRes.matchState.homeScore, 1);
      assert.equal(missedRes.matchState.awayScore, 1);

      // Scored penalty
      const scoredRes = await recordPenaltyService(footballMatch.id, {
        teamId: fbTeamA.id,
        minute: 45,
        isScored: true,
        detail: "Penalty scored bottom corner"
      });
      assert.equal(scoredRes.event.eventType, "GOAL");
      assert.equal(scoredRes.matchState.homeScore, 2);
      assert.equal(scoredRes.matchState.awayScore, 1);
    });

    // 9. Half-time transition
    await test("9. Half-time transition records HALF_TIME event", async () => {
      const res = await recordHalfTimeService(footballMatch.id, { minute: 45 });
      assert.equal(res.event.eventType, "HALF_TIME");
      assert.equal(res.matchState.currentHalf, 1);
    });

    // 10. Second-half transition
    await test("10. Second-half transition advances currentHalf to 2", async () => {
      const res = await startSecondHalfService(footballMatch.id, { minute: 45 });
      assert.equal(res.matchState.currentHalf, 2);
      assert.equal(res.event.eventType, "KICKOFF");
    });

    // 11. Full-time transition
    await test("11. Full-time transition sets status to COMPLETED and determines winner", async () => {
      const res = await recordFullTimeService(footballMatch.id, { minute: 90 });
      assert.equal(res.matchState.status, "COMPLETED");
      assert.equal(res.match.status, "COMPLETED");
      assert.equal(res.match.winnerTeamId, fbTeamA.id);
      assert.ok(res.match.result.includes("won 2-1"));
    });

    // 12. Event timeline ordering
    await test("12. Event timeline is strictly ordered by minute ascending", async () => {
      const stateData = await getFootballMatchStateService(footballMatch.id);
      assert.ok(stateData.events.length >= 8);
      for (let i = 1; i < stateData.events.length; i++) {
        assert.ok(
          stateData.events[i].minute >= stateData.events[i - 1].minute,
          `Event timeline must be ascending: ${stateData.events[i].minute} >= ${stateData.events[i - 1].minute}`
        );
      }
    });

    // 13. Goal undo
    await test("13. Undo rolls back latest event safely", async () => {
      // Latest event was FULL_TIME; undoing it re-opens match to LIVE
      const undoFt = await undoFootballEventService(footballMatch.id);
      assert.equal(undoFt.matchState.status, "LIVE");

      // Record an additional goal to test goal score rollback
      const newGoal = await recordGoalService(footballMatch.id, {
        scoringTeamId: fbTeamB.id,
        minute: 88
      });
      assert.equal(newGoal.matchState.awayScore, 2);

      // Undo the goal
      const undoneGoal = await undoFootballEventService(footballMatch.id);
      assert.equal(undoneGoal.undoneEvent.eventType, "GOAL");
      assert.equal(undoneGoal.matchState.awayScore, 1);
    });

    // 14. Invalid team rejected
    await test("14. Invalid team rejected on goal scoring with 400", async () => {
      let rejected = false;
      try {
        await recordGoalService(footballMatch.id, {
          scoringTeamId: fbOtherTeam.id,
          minute: 50
        });
      } catch (err) {
        rejected = true;
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("Invalid team"));
      }
      assert.equal(rejected, true, "Invalid team must be rejected");
    });

    // 15. Football operation on Cricket match rejected
    await test("15. Football operation on Cricket match rejected with 400", async () => {
      let rejected = false;
      try {
        await recordGoalService(cricketMatch.id, {
          scoringTeamId: cTeamA.id,
          minute: 10
        });
      } catch (err) {
        rejected = true;
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("CRICKET") && err.message.includes("cannot use Football"));
      }
      assert.equal(rejected, true, "Football operation on Cricket match must throw 400");
    });

    // 16. Football operation on Badminton match rejected
    await test("16. Football operation on Badminton match rejected with 400", async () => {
      let rejected = false;
      try {
        await recordGoalService(badmintonMatch.id, {
          scoringTeamId: bTeamA.id,
          minute: 10
        });
      } catch (err) {
        rejected = true;
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("BADMINTON") && err.message.includes("cannot use Football"));
      }
      assert.equal(rejected, true, "Football operation on Badminton match must throw 400");
    });

    // 17. Cricket operation on Football match rejected
    await test("17. Cricket startMatch & toss on Football match rejected with 400", async () => {
      let startMatchRejected = false;
      try {
        await startMatch(footballMatch.id, "dummy-1", "dummy-2", "dummy-3");
      } catch (err) {
        startMatchRejected = true;
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("FOOTBALL") && err.message.includes("cannot be started with Cricket"));
      }
      assert.equal(startMatchRejected, true, "Cricket startMatch on Football match must throw 400");

      let tossRejected = false;
      try {
        await createToss(footballMatch.id, fbTeamA.id, "BAT");
      } catch (err) {
        tossRejected = true;
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("FOOTBALL") && err.message.includes("does not use Cricket"));
      }
      assert.equal(tossRejected, true, "Cricket toss on Football match must throw 400");
    });

    // 18. Badminton operation on Football match rejected
    await test("18. Badminton rally point on Football match rejected with 400", async () => {
      let rejected = false;
      try {
        await recordBadmintonPointService(footballMatch.id, {
          scoringTeamId: fbTeamA.id
        });
      } catch (err) {
        rejected = true;
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("FOOTBALL") && err.message.includes("cannot use Badminton"));
      }
      assert.equal(rejected, true, "Badminton point on Football match must throw 400");
    });

    // 19. Completed match rejects normal scoring event
    await test("19. Completed match rejects new scoring event with 400", async () => {
      // Complete the match
      await recordFullTimeService(footballMatch.id, { minute: 90 });

      let rejected = false;
      try {
        await recordGoalService(footballMatch.id, {
          scoringTeamId: fbTeamA.id,
          minute: 95
        });
      } catch (err) {
        rejected = true;
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("completed"));
      }
      assert.equal(rejected, true, "Completed match must reject new goal scoring");
    });

    // 20. Score never becomes negative
    await test("20. Score never becomes negative under repeated undos", async () => {
      // Create a fresh test match
      const zeroMatch = await prisma.match.create({
        data: {
          tournamentId: footballTournament.id,
          teamAId: fbTeamA.id,
          teamBId: fbTeamB.id,
          venue: "Test Arena",
          matchDate: new Date()
        }
      });

      await startFootballMatchService(zeroMatch.id);

      // Record a single goal
      await recordGoalService(zeroMatch.id, {
        scoringTeamId: fbTeamA.id,
        minute: 10
      });

      // Undo the goal -> score returns to 0
      const undo1 = await undoFootballEventService(zeroMatch.id);
      assert.equal(undo1.matchState.homeScore, 0);

      // Undo kickoff event -> score stays at 0
      const undo2 = await undoFootballEventService(zeroMatch.id);
      assert.equal(undo2.matchState.homeScore, 0);
      assert.equal(undo2.matchState.awayScore, 0);

      // Further undo should be rejected because no events remain
      let rejected = false;
      try {
        await undoFootballEventService(zeroMatch.id);
      } catch (err) {
        rejected = true;
        assert.equal(err.statusCode, 400);
      }
      assert.equal(rejected, true, "Undo with zero events must reject");

      // Verify DB state
      const finalState = await getFootballMatchStateService(zeroMatch.id);
      assert.ok(finalState.matchState.homeScore >= 0);
      assert.ok(finalState.matchState.awayScore >= 0);

      // Cleanup zeroMatch
      await prisma.match.delete({ where: { id: zeroMatch.id } });
    });

    // 21. Verify getLiveMatchService & getScorecardService on Football match
    await test("21. getLiveMatchService and getScorecardService return Football match state without cricket fields", async () => {
      const live = await getLiveMatchService(footballMatch.id);
      assert.equal(live.sport, "FOOTBALL");
      assert.ok(live.matchState);
      assert.equal(live.runs, undefined);
      assert.equal(live.wickets, undefined);
      assert.equal(live.overs, undefined);

      const sc = await getScorecardService(footballMatch.id);
      assert.equal(sc.sport, "FOOTBALL");
      assert.ok(sc.matchState);
      assert.ok(sc.events);
      assert.equal(sc.innings, undefined);
      assert.equal(sc.battingScorecards, undefined);
      assert.equal(sc.bowlingScorecards, undefined);
    });

  } finally {
    // Cleanup created test records
    await prisma.match.deleteMany({
      where: { id: { in: [footballMatch.id, cricketMatch.id, badmintonMatch.id] } }
    });
    await prisma.tournament.deleteMany({
      where: { id: { in: [footballTournament.id, cricketTournament.id, badmintonTournament.id] } }
    });
    await prisma.team.deleteMany({
      where: { id: { in: [fbTeamA.id, fbTeamB.id, fbOtherTeam.id, cTeamA.id, cTeamB.id, bTeamA.id, bTeamB.id] } }
    });
  }

  console.log(`\n========================================`);
  console.log(`FOOTBALL SPORT ISOLATION TESTS: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runFootballSportIsolationTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
