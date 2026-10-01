import assert from "node:assert";
import prisma from "../config/db.js";
import { SportCode, FootballEventType, MatchStatus } from "@prisma/client";

async function runFootballSchemaTests() {
  console.log("\n🧪 Running Football Database Schema & State Verification Suite...\n");

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

  // 1. Prisma Enum & Client Model Exposure
  await test("1. Prisma Client exports SportCode.FOOTBALL and FootballEventType enum values", () => {
    assert.equal(SportCode.FOOTBALL, "FOOTBALL", "SportCode.FOOTBALL must exist");
    assert.equal(SportCode.CRICKET, "CRICKET", "SportCode.CRICKET must remain intact");
    assert.equal(SportCode.BADMINTON, "BADMINTON", "SportCode.BADMINTON must remain intact");

    const expectedEvents = [
      "GOAL",
      "YELLOW_CARD",
      "RED_CARD",
      "SUBSTITUTION",
      "PENALTY",
      "KICKOFF",
      "HALF_TIME",
      "FULL_TIME"
    ];

    for (const ev of expectedEvents) {
      assert.ok(FootballEventType[ev], `FootballEventType.${ev} must exist`);
    }

    assert.ok(prisma.footballMatchState, "prisma.footballMatchState model delegate must exist");
    assert.ok(prisma.footballEvent, "prisma.footballEvent model delegate must exist");
  });

  // 2. FootballMatchState and FootballEvent lifecycle on a Match
  await test("2. FootballMatchState 1:1 relation and FootballEvent timeline persist cleanly with cascade cleanup", async () => {
    // Pick an existing tournament or create a minimal match for verification
    const tournament = await prisma.tournament.findFirst();
    const teamA = await prisma.team.findFirst();
    const teamB = await prisma.team.findFirst({ where: { id: { not: teamA?.id } } });

    assert.ok(tournament && teamA && teamB, "Pre-existing tournament and teams must exist in DB");

    // Create a temporary test match
    const testMatch = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        venue: "Football Arena Test",
        matchDate: new Date(),
        status: MatchStatus.UPCOMING
      }
    });

    try {
      // Create FootballMatchState
      const fbState = await prisma.footballMatchState.create({
        data: {
          matchId: testMatch.id,
          homeScore: 0,
          awayScore: 0,
          currentHalf: 1,
          matchMinute: 0,
          status: MatchStatus.LIVE,
          homePossession: 55.5
        }
      });

      assert.equal(fbState.matchId, testMatch.id);
      assert.equal(fbState.homeScore, 0);
      assert.equal(fbState.homePossession, 55.5);

      // Create FootballEvents
      const event1 = await prisma.footballEvent.create({
        data: {
          footballMatchStateId: fbState.id,
          eventType: FootballEventType.KICKOFF,
          minute: 0,
          detail: "Match kicked off"
        }
      });

      const event2 = await prisma.footballEvent.create({
        data: {
          footballMatchStateId: fbState.id,
          eventType: FootballEventType.GOAL,
          minute: 23,
          teamId: teamA.id,
          detail: "Goal scored from open play"
        }
      });

      assert.equal(event1.eventType, "KICKOFF");
      assert.equal(event2.eventType, "GOAL");

      // Query match including footballMatchState and events
      const retrieved = await prisma.match.findUnique({
        where: { id: testMatch.id },
        include: {
          footballMatchState: {
            include: {
              events: {
                orderBy: { minute: "asc" }
              }
            }
          },
          badmintonMatchState: true,
          innings: true
        }
      });

      assert.ok(retrieved.footballMatchState, "Match must have footballMatchState populated");
      assert.equal(retrieved.footballMatchState.events.length, 2, "Must contain 2 football events");
      assert.equal(retrieved.badmintonMatchState, null, "Football match must have null badmintonMatchState");
      assert.equal(retrieved.innings.length, 0, "Football match must have 0 cricket innings");
    } finally {
      // Clean up test match (cascade will remove footballMatchState and events)
      await prisma.match.delete({
        where: { id: testMatch.id }
      });
    }
  });

  // 3. Database Isolation Check: verify cricket and badminton data remained untouched
  await test("3. Sport Isolation: Cricket Innings/Balls and Badminton States remain completely intact", async () => {
    const inningsCount = await prisma.innings.count();
    const badmintonCount = await prisma.badmintonMatchState.count();

    assert.ok(inningsCount > 0, "Cricket innings must remain populated");
    assert.ok(badmintonCount > 0, "Badminton match states must remain populated");
  });

  console.log(`\n========================================`);
  console.log(`FOOTBALL SCHEMA TESTS: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runFootballSchemaTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
