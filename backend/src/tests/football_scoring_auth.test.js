import assert from "node:assert";
import prisma from "../config/db.js";
import { authorizeScorer } from "../middleware/authorizeScorer.middleware.js";
import { Roles } from "../constants/roles.js";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import crypto from "crypto";

function mockReqRes({ headers = {}, params = {}, body = {}, query = {}, user = null }) {
  const req = {
    headers: { ...headers },
    params: { ...params },
    body: { ...body },
    query: { ...query },
    user
  };
  let statusCode = 200;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  return {
    req,
    res,
    next,
    getResult: () => ({ statusCode, responseData, nextCalled })
  };
}

async function runFootballScoringAuthTests() {
  console.log("\n🧪 Running Football Scoring Authorization Validation Suite...\n");

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

  // 1. Ensure Football Sport exists
  const footballSport = await prisma.sport.upsert({
    where: { code: "FOOTBALL" },
    update: {},
    create: { code: "FOOTBALL", name: "Football", isActive: true }
  });

  // Ensure Roles exist
  const adminRole = await prisma.role.upsert({
    where: { name: Roles.ADMIN },
    update: {},
    create: { name: Roles.ADMIN, description: "Administrator" }
  });
  const orgRole = await prisma.role.upsert({
    where: { name: Roles.ORGANIZER },
    update: {},
    create: { name: Roles.ORGANIZER, description: "Organizer" }
  });
  const scorerRole = await prisma.role.upsert({
    where: { name: Roles.SCORER },
    update: {},
    create: { name: Roles.SCORER, description: "Scorer" }
  });
  const viewerRole = await prisma.role.upsert({
    where: { name: Roles.VIEWER },
    update: {},
    create: { name: Roles.VIEWER, description: "Viewer" }
  });

  // 2. Create Users
  const organizerUser = await prisma.user.create({
    data: {
      firstName: "Football",
      lastName: "Organizer",
      email: `fb_org_${ts}@example.com`,
      password: "dummyhash",
      roleId: orgRole.id
    }
  });

  const adminUser = await prisma.user.create({
    data: {
      firstName: "Football",
      lastName: "Admin",
      email: `fb_admin_${ts}@example.com`,
      password: "dummyhash",
      roleId: adminRole.id
    }
  });

  const assignedScorerUser = await prisma.user.create({
    data: {
      firstName: "Football",
      lastName: "Scorer",
      email: `fb_scorer_${ts}@example.com`,
      password: "dummyhash",
      roleId: scorerRole.id
    }
  });

  const unauthorizedUser = await prisma.user.create({
    data: {
      firstName: "Football",
      lastName: "Viewer",
      email: `fb_unauth_${ts}@example.com`,
      password: "dummyhash",
      roleId: viewerRole.id
    }
  });

  // 3. Create Teams
  const teamA = await prisma.team.create({
    data: {
      name: `Real Madrid ${ts}`,
      shortName: `RMA${ts.toString().slice(-3)}`,
      city: "Madrid",
      sportId: footballSport.id
    }
  });

  const teamB = await prisma.team.create({
    data: {
      name: `Bayern Munich ${ts}`,
      shortName: `BAY${ts.toString().slice(-3)}`,
      city: "Munich",
      sportId: footballSport.id
    }
  });

  // 4. Create Tournament
  const tournament = await prisma.tournament.create({
    data: {
      name: `Champions Cup ${ts}`,
      format: "LEAGUE",
      startDate: new Date(),
      endDate: new Date(),
      sportId: footballSport.id,
      organizerId: organizerUser.id
    }
  });

  const validToken = crypto.randomBytes(24).toString("hex");

  // 5. Create Football Match with scoringToken
  const match = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      teamAId: teamA.id,
      teamBId: teamB.id,
      matchDate: new Date(),
      venue: "Santiago Bernabeu",
      status: "LIVE",
      scoringToken: validToken,
      scoringTokenGeneratedAt: new Date(),
      scorerId: assignedScorerUser.id
    }
  });

  // TEST 1: Valid Scoring Token via Header 'x-scoring-token'
  await test("Valid Scoring Token via x-scoring-token allows access", async () => {
    const { req, res, next, getResult } = mockReqRes({
      params: { matchId: match.id },
      headers: { "x-scoring-token": validToken }
    });

    await authorizeScorer(req, res, next);
    const { nextCalled } = getResult();
    assert.strictEqual(nextCalled, true, "next() should have been called for valid scoring token");
    assert.strictEqual(req.isTokenScorer, true);
    assert.strictEqual(req.scoringMatchId, match.id);
  });

  // TEST 2: Valid Scoring Token via Query 'token' / 'accessToken'
  await test("Valid Scoring Token via query param allows access", async () => {
    const { req, res, next, getResult } = mockReqRes({
      params: { matchId: match.id },
      query: { token: validToken }
    });

    await authorizeScorer(req, res, next);
    const { nextCalled } = getResult();
    assert.strictEqual(nextCalled, true, "next() should have been called for valid query token");
  });

  // TEST 3: Invalid Scoring Token without Bearer JWT rejects with 403
  await test("Invalid Scoring Token without user authentication is rejected with 403", async () => {
    const { req, res, next, getResult } = mockReqRes({
      params: { matchId: match.id },
      headers: { "x-scoring-token": "completely-invalid-token-12345" }
    });

    await authorizeScorer(req, res, next);
    const { statusCode, responseData, nextCalled } = getResult();
    assert.strictEqual(nextCalled, false, "next() should NOT be called for invalid token");
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseData.message, "Invalid, expired, or revoked scoring access link.");
  });

  // TEST 4: Revoked Scoring Token (match token is null) rejects with 403
  await test("Revoked Scoring Token on match is rejected with 403", async () => {
    const revokedMatch = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        matchDate: new Date(),
        venue: "Camp Nou",
        status: "LIVE",
        scoringToken: null
      }
    });

    const { req, res, next, getResult } = mockReqRes({
      params: { matchId: revokedMatch.id },
      headers: { "x-scoring-token": validToken }
    });

    await authorizeScorer(req, res, next);
    const { statusCode, responseData, nextCalled } = getResult();
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseData.message, "Invalid, expired, or revoked scoring access link.");
  });

  // TEST 5: Completed Match rejects guest token access
  await test("Completed Match rejects guest token access with 403", async () => {
    const completedMatch = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        matchDate: new Date(),
        venue: "Allianz Arena",
        status: "COMPLETED",
        scoringToken: "completed-token-123"
      }
    });

    const { req, res, next, getResult } = mockReqRes({
      params: { matchId: completedMatch.id },
      headers: { "x-scoring-token": "completed-token-123" }
    });

    await authorizeScorer(req, res, next);
    const { statusCode, responseData, nextCalled } = getResult();
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseData.message, "Invalid, expired, or revoked scoring access link.");
  });

  // TEST 6: Dual-mode Fallback: Admin JWT allows scoring even when stale/mismatched x-scoring-token is present
  await test("Dual-mode: Admin Bearer JWT allows access even when stale x-scoring-token is present", async () => {
    const adminJwt = jwt.sign(
      { userId: adminUser.id, role: Roles.ADMIN },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const { req, res, next, getResult } = mockReqRes({
      params: { matchId: match.id },
      headers: {
        "x-scoring-token": "stale-session-token-from-different-match",
        authorization: `Bearer ${adminJwt}`
      }
    });

    await authorizeScorer(req, res, next);
    const { nextCalled } = getResult();
    assert.strictEqual(nextCalled, true, "Admin should be authorized via Bearer JWT fallback");
  });

  // TEST 7: Dual-mode Fallback: Assigned Scorer Bearer JWT allows access
  await test("Dual-mode: Assigned Scorer Bearer JWT allows access", async () => {
    const scorerJwt = jwt.sign(
      { userId: assignedScorerUser.id, role: Roles.SCORER },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const { req, res, next, getResult } = mockReqRes({
      params: { matchId: match.id },
      headers: {
        authorization: `Bearer ${scorerJwt}`
      }
    });

    await authorizeScorer(req, res, next);
    const { nextCalled } = getResult();
    assert.strictEqual(nextCalled, true, "Assigned Scorer should be authorized via Bearer JWT");
  });

  // TEST 8: Unauthorized Viewer JWT is denied access
  await test("Unauthorized Viewer JWT is rejected with 403", async () => {
    const viewerJwt = jwt.sign(
      { userId: unauthorizedUser.id, role: Roles.VIEWER },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const { req, res, next, getResult } = mockReqRes({
      params: { matchId: match.id },
      headers: {
        authorization: `Bearer ${viewerJwt}`
      }
    });

    await authorizeScorer(req, res, next);
    const { statusCode, responseData, nextCalled } = getResult();
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseData.message, "Access denied. You are not authorized to score or control this match.");
  });

  console.log(`\n========================================`);
  console.log(`FOOTBALL SCORING AUTH TESTS: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runFootballScoringAuthTests()
  .catch((err) => {
    console.error("FATAL Auth test error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
