import test from "node:test";
import assert from "node:assert/strict";
import {
  checkGameWon,
  calculateRallyPoint
} from "../engine/badminton/badmintonRule.engine.js";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000/api/v1";

// Helper function to register and login an organizer for testing
async function getAuthenticatedOrganizerToken() {
  const email = `badminton_org_${Date.now()}@criclive.com`;
  const password = "Password123!";

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Badminton",
      lastName: "Organizer",
      email,
      password
    })
  });
  assert.equal(regRes.status, 201);

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      captchaToken: "test_captcha_bypass_token"
    })
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  const token = loginData.data.token;

  await fetch(`${BASE_URL}/organizer-applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      organizationName: `Badminton Org ${Date.now()}`,
      city: "Bangalore"
    })
  });

  return token;
}

test("🏸 Badminton Scoring Engine Unit & Integration Verification Suite", async (t) => {
  const teamAId = "team-a-uuid-1111";
  const teamBId = "team-b-uuid-2222";
  const mockMatch = { teamAId, teamBId };

  await t.test("1. checkGameWon unit rule tests", () => {
    assert.equal(checkGameWon(0, 0), false, "0-0 should not be won");
    assert.equal(checkGameWon(20, 19), false, "20-19 should not be won");
    assert.equal(checkGameWon(21, 0), true, "21-0 should be won");
    assert.equal(checkGameWon(21, 19), true, "21-19 should be won");
    assert.equal(checkGameWon(20, 20), false, "20-20 deuce should not be won");
    assert.equal(checkGameWon(21, 20), false, "21-20 should not be won (lead is 1)");
    assert.equal(checkGameWon(22, 20), true, "22-20 should be won (lead is 2)");
    assert.equal(checkGameWon(24, 22), true, "24-22 should be won");
    assert.equal(checkGameWon(29, 29), false, "29-29 should not be won");
    assert.equal(checkGameWon(30, 29), true, "30-29 max cap should be won");
    assert.equal(checkGameWon(-1, 0), false, "Negative points invalid");
  });

  await t.test("2. calculateRallyPoint - 0-0 start and normal rally", () => {
    const initialState = {
      currentGame: 1,
      teamASetsWon: 0,
      teamBSetsWon: 0,
      teamAPointsGame1: 0,
      teamBPointsGame1: 0,
      status: "LIVE"
    };

    const result = calculateRallyPoint(initialState, mockMatch, teamAId);
    assert.equal(result.nextState.teamAPointsGame1, 1);
    assert.equal(result.nextState.teamBPointsGame1, 0);
    assert.equal(result.isGameWon, false);
    assert.equal(result.pointData.serviceCourt, "LEFT"); // 1 is ODD -> LEFT court
  });

  await t.test("3. calculateRallyPoint - 20-20 deuce to 22-20 game victory", () => {
    const deuceState = {
      currentGame: 1,
      teamASetsWon: 0,
      teamBSetsWon: 0,
      teamAPointsGame1: 20,
      teamBPointsGame1: 20,
      status: "LIVE"
    };

    // 21-20
    const step1 = calculateRallyPoint(deuceState, mockMatch, teamAId);
    assert.equal(step1.isGameWon, false);
    assert.equal(step1.nextState.teamAPointsGame1, 21);

    // 22-20 -> Team A wins Game 1!
    const step2 = calculateRallyPoint(step1.nextState, mockMatch, teamAId);
    assert.equal(step2.isGameWon, true);
    assert.equal(step2.nextState.teamASetsWon, 1);
    assert.equal(step2.nextState.currentGame, 2);
    assert.equal(step2.isMatchWon, false);
  });

  await t.test("4. calculateRallyPoint - 2-0 Match Victory & completion", () => {
    const game2EndState = {
      currentGame: 2,
      teamASetsWon: 1,
      teamBSetsWon: 0,
      teamAPointsGame1: 22,
      teamBPointsGame1: 20,
      teamAPointsGame2: 20,
      teamBPointsGame2: 19,
      status: "LIVE"
    };

    // Score 21st point in Game 2 (21-19) -> Team A wins 2-0 match!
    const result = calculateRallyPoint(game2EndState, mockMatch, teamAId);
    assert.equal(result.isGameWon, true);
    assert.equal(result.isMatchWon, true);
    assert.equal(result.winningTeamId, teamAId);
    assert.equal(result.nextState.status, "COMPLETED");
    assert.equal(result.nextState.teamASetsWon, 2);
  });

  await t.test("5. calculateRallyPoint - Reject scoring after match completion", () => {
    const completedState = {
      currentGame: 2,
      teamASetsWon: 2,
      teamBSetsWon: 0,
      status: "COMPLETED"
    };

    assert.throws(
      () => calculateRallyPoint(completedState, mockMatch, teamAId),
      (err) => err.statusCode === 400 && /Match is already completed/i.test(err.message)
    );
  });

  await t.test("6. Integration API - Full Badminton Match Scoring & Undo Flow", async () => {
    const token = await getAuthenticatedOrganizerToken();

    // Create Badminton Tournament & Teams
    const tourneyRes = await fetch(`${BASE_URL}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: `Badminton E2E Cup ${Date.now()}`,
        format: "KNOCKOUT",
        startDate: "2026-09-01T10:00:00Z",
        endDate: "2026-09-05T10:00:00Z",
        sport: "BADMINTON"
      })
    });
    assert.equal(tourneyRes.status, 201);
    const tourney = (await tourneyRes.json()).data;

    // Get existing teams from database
    const teamsRes = await fetch(`${BASE_URL}/teams`);
    assert.equal(teamsRes.status, 200);
    const teamsList = (await teamsRes.json()).data;
    assert.ok(teamsList.length >= 2, "Must have at least 2 teams");
    const teamA = teamsList[0];
    const teamB = teamsList[1];

    // Create Match
    const matchRes = await fetch(`${BASE_URL}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        tournamentId: tourney.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        venue: "Kanteerava Indoor Stadium",
        matchDate: "2026-09-02T10:00:00Z"
      })
    });
    assert.equal(matchRes.status, 201);
    const match = (await matchRes.json()).data;

    // Fetch initial Badminton state
    const stateRes = await fetch(`${BASE_URL}/badminton/matches/${match.id}/state`);
    assert.equal(stateRes.status, 200);
    const stateData = (await stateRes.json()).data;
    assert.equal(stateData.matchState.currentGame, 1);
    assert.equal(stateData.matchState.teamASetsWon, 0);

    // Record point for Team A
    const pt1Res = await fetch(`${BASE_URL}/badminton/matches/${match.id}/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scoringTeamId: teamA.id, commentary: "Smash down the line!" })
    });
    const pt1Json = await pt1Res.json();
    assert.equal(pt1Res.status, 201, `Failed recording point: ${JSON.stringify(pt1Json)}`);
    const pt1Data = pt1Json.data;
    assert.equal(pt1Data.matchState.teamAPointsGame1, 1);

    // Undo point
    const undoRes = await fetch(`${BASE_URL}/badminton/matches/${match.id}/undo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({})
    });
    assert.equal(undoRes.status, 200);
    const undoData = (await undoRes.json()).data;
    assert.equal(undoData.matchState.teamAPointsGame1, 0);
  });

  await t.test("7. Sport Isolation: Cricket match cannot use Badminton scoring (400)", async () => {
    // Get an existing Cricket match ID from the public matches endpoint
    const matchesRes = await fetch(`${BASE_URL}/matches`);
    const matchesData = await matchesRes.json();
    const cricketMatch = matchesData.data.find(m => !m.tournament?.sport || m.tournament?.sport?.code === "CRICKET");

    if (cricketMatch) {
      const badScoringRes = await fetch(`${BASE_URL}/badminton/matches/${cricketMatch.id}/state`);
      assert.equal(badScoringRes.status, 400, "Cricket match must return HTTP 400 when accessing Badminton scoring");
      const json = await badScoringRes.json();
      assert.equal(json.success, false);
      assert.match(json.message, /Match belongs to Cricket/i);
    }
  });
});
