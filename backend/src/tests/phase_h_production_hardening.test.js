import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000/api/v1";

// Helper function to register and login an organizer for testing
async function getAuthenticatedOrganizerToken() {
  const email = `harden_org_${Date.now()}@criclive.com`;
  const password = "Password123!";

  // 1. Register user
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Harden",
      lastName: "Organizer",
      email,
      password
    })
  });
  assert.equal(regRes.status, 201, "Organizer registration should succeed");

  // 2. Login
  let loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      captchaToken: "test_captcha_bypass_token"
    })
  });
  assert.equal(loginRes.status, 200, "First login should succeed");
  let loginData = await loginRes.json();
  let token = loginData.data.token;

  // 3. Make user an organizer via organizer application
  const appRes = await fetch(`${BASE_URL}/organizer-applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      organizationName: `Harden Org ${Date.now()}`,
      city: "Rajkot"
    })
  });
  assert.equal(appRes.status, 201, "Organizer application should succeed");

  // 4. Login again to refresh JWT with upgraded organizer role
  loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      captchaToken: "test_captcha_bypass_token"
    })
  });
  assert.equal(loginRes.status, 200, "Refreshed login should succeed");
  loginData = await loginRes.json();
  return loginData.data.token;
}

test("🛡️ Phase H: Production Hardening & safety Suite", async (t) => {
  let organizerToken;
  let badmintonMatchId;
  let teamAId;
  let teamBId;

  const serverX = crypto.randomUUID();
  const receiverY = crypto.randomUUID();
  const serverZ = crypto.randomUUID();
  const receiverW = crypto.randomUUID();

  await t.test("Setup Badminton Match Data", async () => {
    organizerToken = await getAuthenticatedOrganizerToken();

    // 1. Create a Badminton tournament
    const tourneyRes = await fetch(`${BASE_URL}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        name: `Harden Badminton Tourney ${Date.now()}`,
        description: "Hardening integration test",
        format: "LEAGUE",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        sport: "BADMINTON"
      })
    });
    assert.equal(tourneyRes.status, 201, "Tournament creation should succeed");
    const tourney = (await tourneyRes.json()).data;

    // 2. Create Teams
    const teamARes = await fetch(`${BASE_URL}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        name: `Harden Team A ${Date.now()}`,
        shortName: `HA${Math.floor(Math.random() * 900 + 100)}`,
        city: "Surat",
        sport: "BADMINTON"
      })
    });
    assert.equal(teamARes.status, 201);
    teamAId = (await teamARes.json()).data.id;

    const teamBRes = await fetch(`${BASE_URL}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        name: `Harden Team B ${Date.now()}`,
        shortName: `HB${Math.floor(Math.random() * 900 + 100)}`,
        city: "Surat",
        sport: "BADMINTON"
      })
    });
    assert.equal(teamBRes.status, 201);
    teamBId = (await teamBRes.json()).data.id;

    // Register teams to tournament
    const regC = await fetch(`${BASE_URL}/tournament-teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({ tournamentId: tourney.id, teamId: teamAId })
    });
    assert.equal(regC.status, 201);

    const regB = await fetch(`${BASE_URL}/tournament-teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({ tournamentId: tourney.id, teamId: teamBId })
    });
    assert.equal(regB.status, 201);

    // Create Match
    const matchRes = await fetch(`${BASE_URL}/matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        tournamentId: tourney.id,
        teamAId: teamAId,
        teamBId: teamBId,
        venue: "Hardening Arena",
        matchDate: new Date().toISOString()
      })
    });
    assert.equal(matchRes.status, 201, "Match creation should succeed");
    badmintonMatchId = (await matchRes.json()).data.id;
  });

  await t.test("1. Invalid UUID on normal match endpoint returns 400", async () => {
    const res = await fetch(`${BASE_URL}/matches/invalid-uuid`, {
      headers: { Authorization: `Bearer ${organizerToken}` }
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /invalid format/i);
  });

  await t.test("2. Invalid UUID on Badminton state endpoint returns 400", async () => {
    const res = await fetch(`${BASE_URL}/badminton/matches/invalid-uuid/state`, {
      headers: { Authorization: `Bearer ${organizerToken}` }
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /invalid format/i);
  });

  await t.test("3. Invalid UUID on Badminton scoring endpoint returns 400", async () => {
    const res = await fetch(`${BASE_URL}/badminton/matches/invalid-uuid/points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        scoringTeamId: teamAId,
        pointType: "RALLY_POINT"
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /invalid format/i);
  });

  await t.test("4. Badminton undo restores previous server/receiver state correctly", async () => {
    // 1. Record point 1 with serverX and receiverY
    const p1Res = await fetch(`${BASE_URL}/badminton/matches/${badmintonMatchId}/points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        scoringTeamId: teamAId,
        serverId: serverX,
        receiverId: receiverY,
        commentary: "First point rally"
      })
    });
    assert.equal(p1Res.status, 201);
    const p1Data = (await p1Res.json()).data;
    assert.equal(p1Data.matchState.currentServerId, serverX);
    assert.equal(p1Data.matchState.currentReceiverId, receiverY);
    assert.equal(p1Data.matchState.teamAPointsGame1, 1);

    // 2. Record point 2 with serverZ and receiverW
    const p2Res = await fetch(`${BASE_URL}/badminton/matches/${badmintonMatchId}/points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        scoringTeamId: teamBId,
        serverId: serverZ,
        receiverId: receiverW,
        commentary: "Second point rally"
      })
    });
    assert.equal(p2Res.status, 201);
    const p2Data = (await p2Res.json()).data;
    assert.equal(p2Data.matchState.currentServerId, serverZ);
    assert.equal(p2Data.matchState.currentReceiverId, receiverW);
    assert.equal(p2Data.matchState.teamBPointsGame1, 1);

    // 3. Undo the second point
    const undoRes = await fetch(`${BASE_URL}/badminton/matches/${badmintonMatchId}/undo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({})
    });
    assert.equal(undoRes.status, 200, "Undo should succeed");
    const undoData = (await undoRes.json()).data;

    // 4. Verify state is restored back to first point's values
    assert.equal(undoData.matchState.teamAPointsGame1, 1, "Team A score should be restored to 1");
    assert.equal(undoData.matchState.teamBPointsGame1, 0, "Team B score should be restored to 0");
    assert.equal(undoData.matchState.currentServerId, serverX, "Server should revert to serverX");
    assert.equal(undoData.matchState.currentReceiverId, receiverY, "Receiver should revert to receiverY");
  });
});
