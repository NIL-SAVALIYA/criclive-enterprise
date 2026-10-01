import assert from "node:assert";
import prisma from "../config/db.js";
import { SPORTS_CONFIG, getSportConfig, hasCapability } from "../config/sports.config.js";
import { startMatch } from "../services/startMatch.service.js";
import { createToss } from "../services/toss.service.js";
import { createBallService } from "../services/ball.service.js";
import {
  getBadmintonMatchStateService,
  recordBadmintonPointService,
  undoBadmintonPointService,
  validateBadmintonMatch
} from "../services/badmintonMatch.service.js";
import { getLiveMatchService } from "../services/liveMatch.service.js";
import { getScorecardService } from "../services/scorecard.service.js";
import { getAllMatches, getMatchById } from "../repositories/match.repository.js";

async function runSportIsolationTests() {
  console.log("\n🧪 Running CRICLIVE Multi-Sport Isolation & Rules Test Suite...\n");

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

  // 1. Central Sport Configuration tests
  await test("1. Central Sport Registry: verifies Cricket and Badminton configurations & capabilities", () => {
    assert.ok(SPORTS_CONFIG.CRICKET, "Cricket config must exist");
    assert.ok(SPORTS_CONFIG.BADMINTON, "Badminton config must exist");

    assert.equal(hasCapability("CRICKET", "ballByBallScoring"), true);
    assert.equal(hasCapability("CRICKET", "rallyScoring"), false);
    assert.equal(hasCapability("CRICKET", "wickets"), true);
    assert.equal(hasCapability("CRICKET", "overs"), true);

    assert.equal(hasCapability("BADMINTON", "ballByBallScoring"), false);
    assert.equal(hasCapability("BADMINTON", "rallyScoring"), true);
    assert.equal(hasCapability("BADMINTON", "wickets"), false);
    assert.equal(hasCapability("BADMINTON", "overs"), false);
    assert.equal(hasCapability("BADMINTON", "sets"), true);
    assert.equal(hasCapability("BADMINTON", "games"), true);

    const cConfig = getSportConfig("CRICKET");
    const bConfig = getSportConfig("BADMINTON");
    assert.equal(cConfig.terminology.score, "Runs");
    assert.equal(bConfig.terminology.score, "Points");
  });

  const ts = Date.now();

  // Ensure Sport entities exist in DB
  const cricketSport = await prisma.sport.upsert({
    where: { code: "CRICKET" },
    update: { isActive: true },
    create: { code: "CRICKET", name: "Cricket", icon: "🏏", isActive: true }
  });

  const badmintonSport = await prisma.sport.upsert({
    where: { code: "BADMINTON" },
    update: { isActive: true },
    create: { code: "BADMINTON", name: "Badminton", icon: "🏸", isActive: true }
  });

  // Setup Cricket Tournament & Teams
  const cricketTourney = await prisma.tournament.create({
    data: {
      name: `Cricket Tourney ${ts}`,
      format: "LEAGUE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      status: "UPCOMING",
      sportId: cricketSport.id
    }
  });

  const cricketTeamA = await prisma.team.create({
    data: { name: `Cricket Team A ${ts}`, shortName: `CA${ts.toString().slice(-4)}`, city: "City CA", sportId: cricketSport.id }
  });
  const cricketTeamB = await prisma.team.create({
    data: { name: `Cricket Team B ${ts}`, shortName: `CB${ts.toString().slice(-4)}`, city: "City CB", sportId: cricketSport.id }
  });

  const cricketMatch = await prisma.match.create({
    data: {
      tournamentId: cricketTourney.id,
      teamAId: cricketTeamA.id,
      teamBId: cricketTeamB.id,
      venue: "National Cricket Stadium",
      matchDate: new Date(),
      status: "UPCOMING"
    }
  });

  // Setup Badminton Tournament & Teams
  const badmintonTourney = await prisma.tournament.create({
    data: {
      name: `Badminton Championship ${ts}`,
      format: "KNOCKOUT",
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      status: "UPCOMING",
      sportId: badmintonSport.id
    }
  });

  const badmintonTeamA = await prisma.team.create({
    data: { name: `Badminton Side A ${ts}`, shortName: `BA${ts.toString().slice(-4)}`, city: "City BA", sportId: badmintonSport.id }
  });
  const badmintonTeamB = await prisma.team.create({
    data: { name: `Badminton Side B ${ts}`, shortName: `BB${ts.toString().slice(-4)}`, city: "City BB", sportId: badmintonSport.id }
  });

  const badmintonMatch = await prisma.match.create({
    data: {
      tournamentId: badmintonTourney.id,
      teamAId: badmintonTeamA.id,
      teamBId: badmintonTeamB.id,
      venue: "Badminton Indoor Arena",
      matchDate: new Date(),
      status: "UPCOMING"
    }
  });

  // 2. Cross-Sport Rejection Tests
  await test("2. Cricket startMatch rejects Badminton match", async () => {
    let rejected = false;
    try {
      await startMatch(badmintonMatch.id, "dummy-1", "dummy-2", "dummy-3");
    } catch (err) {
      rejected = true;
      assert.ok(err.message.includes("BADMINTON") || err.message.includes("cannot be started"));
    }
    assert.equal(rejected, true, "startMatch on Badminton match must throw error");
  });

  await test("3. Cricket createToss rejects Badminton match", async () => {
    let rejected = false;
    try {
      await createToss(badmintonMatch.id, badmintonTeamA.id, "BAT");
    } catch (err) {
      rejected = true;
      assert.ok(err.message.includes("BADMINTON") || err.message.includes("does not use Cricket"));
    }
    assert.equal(rejected, true, "Cricket toss on Badminton match must throw error");
  });

  await test("4. Badminton rally scoring rejects Cricket match", async () => {
    let rejected = false;
    try {
      await recordBadmintonPointService(cricketMatch.id, {
        scoringTeamId: cricketTeamA.id
      });
    } catch (err) {
      rejected = true;
      assert.ok(err.message.includes("CRICKET") && err.message.includes("cannot use Badminton"));
    }
    assert.equal(rejected, true, "Badminton point on Cricket match must throw error");
  });

  // 3. Badminton Scoring Engine Execution
  await test("5. Badminton match state initialization & rally scoring succeeds", async () => {
    const initialState = await getBadmintonMatchStateService(badmintonMatch.id);
    assert.ok(initialState.matchState, "Match state should be initialized");
    assert.equal(initialState.matchState.currentGame, 1);
    assert.equal(initialState.matchState.teamASetsWon, 0);

    const pointRes = await recordBadmintonPointService(badmintonMatch.id, {
      scoringTeamId: badmintonTeamA.id,
      commentary: "Smashed cleanly into deep corner"
    });

    assert.ok(pointRes.matchState, "Must return matchState");
    assert.equal(pointRes.matchState.teamAPointsGame1, 1);
    assert.equal(pointRes.matchState.teamBPointsGame1, 0);
    assert.equal(pointRes.isGameWon, false);

    // Score another point for Team B
    const pointRes2 = await recordBadmintonPointService(badmintonMatch.id, {
      scoringTeamId: badmintonTeamB.id
    });
    assert.equal(pointRes2.matchState.teamAPointsGame1, 1);
    assert.equal(pointRes2.matchState.teamBPointsGame1, 1);
  });

  await test("6. Badminton point undo restores match state", async () => {
    const undoRes = await undoBadmintonPointService(badmintonMatch.id);
    assert.ok(undoRes.matchState);
    assert.equal(undoRes.matchState.teamBPointsGame1, 0);
    assert.equal(undoRes.matchState.teamAPointsGame1, 1);
  });

  // 4. Live Match & Scorecard Service Isolation
  await test("7. getLiveMatchService returns Badminton structure for Badminton match without cricket overs/runs", async () => {
    const live = await getLiveMatchService(badmintonMatch.id);
    assert.ok(live.matchState, "Must return matchState");
    assert.equal(live.matchState.teamAPointsGame1, 1);
    assert.equal(live.matchState.teamBPointsGame1, 0);
    // Should NOT contain cricket innings runs/wickets/overs
    assert.equal(live.innings, undefined, "Badminton live match must not have cricket innings");
    assert.equal(live.score, undefined, "Badminton live match must not have cricket score object");
  });

  await test("8. getScorecardService returns Badminton scorecard without batting/bowling scorecard lists", async () => {
    const sc = await getScorecardService(badmintonMatch.id);
    assert.equal(sc.sport, "BADMINTON");
    assert.ok(sc.matchState);
    assert.equal(sc.batting, undefined, "Badminton scorecard must not have batting list");
    assert.equal(sc.bowling, undefined, "Badminton scorecard must not have bowling list");
  });

  // 5. Match Repository Filtering & Inclusion
  await test("9. getAllMatches correctly filters by sport and includes badmintonMatchState", async () => {
    const badmintonResult = await getAllMatches({ sport: "BADMINTON" });
    const bMatches = badmintonResult.matches;
    assert.ok(bMatches.length > 0);
    for (const m of bMatches) {
      assert.equal(m.tournament.sport.code, "BADMINTON");
    }

    const foundBMatch = bMatches.find((m) => m.id === badmintonMatch.id);
    assert.ok(foundBMatch, "Created badminton match should be in filtered list");
    assert.ok(foundBMatch.badmintonMatchState, "badmintonMatchState must be included");

    const cricketResult = await getAllMatches({ sport: "CRICKET" });
    const cMatches = cricketResult.matches;
    assert.ok(cMatches.length > 0);
    for (const m of cMatches) {
      assert.equal(m.tournament.sport.code, "CRICKET");
    }
  });

  await test("10. getMatchById includes badmintonMatchState", async () => {
    const match = await getMatchById(badmintonMatch.id);
    assert.ok(match);
    assert.equal(match.tournament.sport.code, "BADMINTON");
    assert.ok(match.badmintonMatchState);
    assert.equal(match.badmintonMatchState.teamAPointsGame1, 1);
  });

  console.log("\n========================================");
  console.log(`SPORT ISOLATION TESTS: ${passed} Passed, ${failed} Failed`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSportIsolationTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
