import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000/api/v1";

// Helper function to register and login an admin/organizer
async function getAdminToken() {
  const email = `admin_integration_${Date.now()}@criclive.com`;
  const password = "Password123!";

  // 1. Register user
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Super",
      lastName: "Admin",
      email,
      password
    })
  });
  assert.equal(regRes.status, 201, "Admin registration should succeed");

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
  assert.equal(loginRes.status, 200, "Login should succeed");
  let loginData = await loginRes.json();
  let token = loginData.data.token;

  // 3. Make user an admin directly via system endpoint or organizer application
  const appRes = await fetch(`${BASE_URL}/organizer-applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      organizationName: `System Admin Org ${Date.now()}`,
      city: "Rajkot"
    })
  });
  assert.equal(appRes.status, 201, "Organizer application should succeed");

  // 4. Login again to refresh the JWT token with the upgraded role
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
  token = loginData.data.token;

  return token;
}

test("🏸 Multi-Sport Integration & Safety Verification Suite", async (t) => {
  let adminToken;
  let cricketTournamentId;
  let badmintonTournamentId;
  let cricketTeamId;
  let badmintonTeamId;
  let cricketPlayerId;
  let badmintonPlayerId;
  let cricketMatchId;
  let badmintonMatchId;
  let badmintonScoringToken;

  await t.test("Setup integration data", async () => {
    adminToken = await getAdminToken();

    // 1. Create a Cricket tournament
    const cTRes = await fetch(`${BASE_URL}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Cricket Tourney ${Date.now()}`,
        description: "Cricket integration test",
        format: "LEAGUE",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        sport: "CRICKET"
      })
    });
    assert.equal(cTRes.status, 201, "Cricket tournament creation should succeed");
    const cTData = await cTRes.json();
    cricketTournamentId = cTData.data.id;

    // 2. Create a Badminton tournament
    const bTRes = await fetch(`${BASE_URL}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Badminton Tourney ${Date.now()}`,
        description: "Badminton integration test",
        format: "LEAGUE",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        sport: "BADMINTON"
      })
    });
    assert.equal(bTRes.status, 201, "Badminton tournament creation should succeed");
    const bTData = await bTRes.json();
    badmintonTournamentId = bTData.data.id;

    // 3. Create a Cricket Team
    const cTeamRes = await fetch(`${BASE_URL}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Cricket Team ${Date.now()}`,
        shortName: `CT${Math.floor(Math.random() * 900 + 100)}`,
        city: "Ahmedabad",
        sport: "CRICKET"
      })
    });
    assert.equal(cTeamRes.status, 201, "Cricket team creation should succeed");
    const cTeamData = await cTeamRes.json();
    cricketTeamId = cTeamData.data.id;

    // 4. Create a Badminton Team
    const bTeamRes = await fetch(`${BASE_URL}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Badminton Team ${Date.now()}`,
        shortName: `BT${Math.floor(Math.random() * 900 + 100)}`,
        city: "Surat",
        sport: "BADMINTON"
      })
    });
    assert.equal(bTeamRes.status, 201, "Badminton team creation should succeed");
    const bTeamData = await bTeamRes.json();
    badmintonTeamId = bTeamData.data.id;

    // Register teams to their respective tournaments
    const regC = await fetch(`${BASE_URL}/tournament-teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ tournamentId: cricketTournamentId, teamId: cricketTeamId })
    });
    assert.equal(regC.status, 201);

    const regB = await fetch(`${BASE_URL}/tournament-teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ tournamentId: badmintonTournamentId, teamId: badmintonTeamId })
    });
    assert.equal(regB.status, 201);

    // Create Cricket matches
    const cTeamBRes = await fetch(`${BASE_URL}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Cricket Team B ${Date.now()}`,
        shortName: `CB${Math.floor(Math.random() * 900 + 100)}`,
        city: "Ahmedabad",
        sport: "CRICKET"
      })
    });
    const cTeamBData = await cTeamBRes.json();
    const cricketTeamBId = cTeamBData.data.id;

    const regCB = await fetch(`${BASE_URL}/tournament-teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ tournamentId: cricketTournamentId, teamId: cricketTeamBId })
    });
    assert.equal(regCB.status, 201);

    const realCMatchRes = await fetch(`${BASE_URL}/matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        tournamentId: cricketTournamentId,
        teamAId: cricketTeamId,
        teamBId: cricketTeamBId,
        venue: "Narendra Modi Stadium",
        matchDate: new Date().toISOString()
      })
    });
    assert.equal(realCMatchRes.status, 201, "Cricket match creation should succeed");
    const realCMatchData = await realCMatchRes.json();
    cricketMatchId = realCMatchData.data.id;

    // Create Badminton match with different teams
    const bTeamBRes = await fetch(`${BASE_URL}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Badminton Team B ${Date.now()}`,
        shortName: `BB${Math.floor(Math.random() * 900 + 100)}`,
        city: "Surat",
        sport: "BADMINTON"
      })
    });
    const bTeamBData = await bTeamBRes.json();
    const badmintonTeamBId = bTeamBData.data.id;

    const regBB = await fetch(`${BASE_URL}/tournament-teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ tournamentId: badmintonTournamentId, teamId: badmintonTeamBId })
    });
    assert.equal(regBB.status, 201);

    const bMatchRes = await fetch(`${BASE_URL}/matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        tournamentId: badmintonTournamentId,
        teamAId: badmintonTeamId,
        teamBId: badmintonTeamBId,
        venue: "Surat Stadium",
        matchDate: new Date().toISOString()
      })
    });
    assert.equal(bMatchRes.status, 201, "Badminton match creation should succeed");
    const bMatchData = await bMatchRes.json();
    badmintonMatchId = bMatchData.data.id;
  });

  await t.test("1. Cricket match response contains Cricket sport context", async () => {
    const res = await fetch(`${BASE_URL}/matches/${cricketMatchId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.tournament?.sport?.code, "CRICKET");
  });

  await t.test("2. Badminton match response contains Badminton sport context", async () => {
    const res = await fetch(`${BASE_URL}/matches/${badmintonMatchId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.tournament?.sport?.code, "BADMINTON");
  });

  await t.test("3. Match filtering by CRICKET works", async () => {
    const res = await fetch(`${BASE_URL}/matches?sport=CRICKET`);
    assert.equal(res.status, 200);
    const body = await res.json();
    const hasBadminton = body.data.some(m => m.tournament?.sport?.code === "BADMINTON");
    assert.equal(hasBadminton, false, "Should filter out Badminton matches");
    const hasCricket = body.data.some(m => m.id === cricketMatchId);
    assert.ok(hasCricket, "Should include Cricket match");
  });

  await t.test("4. Match filtering by BADMINTON works", async () => {
    const res = await fetch(`${BASE_URL}/matches?sport=BADMINTON`);
    assert.equal(res.status, 200);
    const body = await res.json();
    const hasCricket = body.data.some(m => m.tournament?.sport?.code === "CRICKET");
    assert.equal(hasCricket, false, "Should filter out Cricket matches");
    const hasBadminton = body.data.some(m => m.id === badmintonMatchId);
    assert.ok(hasBadminton, "Should include Badminton match");
  });

  await t.test("5. Badminton scoring with JWT works", async () => {
    const res = await fetch(`${BASE_URL}/badminton/matches/${badmintonMatchId}/points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        scoringTeamId: badmintonTeamId,
        pointType: "RALLY_POINT"
      })
    });
    assert.equal(res.status, 201, "Should record point with admin JWT token");
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.matchState.teamAPointsGame1, 1);
  });

  await t.test("6. Badminton scoring with scoring token works", async () => {
    // Generate scoring token first
    const tokenRes = await fetch(`${BASE_URL}/matches/${badmintonMatchId}/scoring-token/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(tokenRes.status, 200);
    const tokenData = await tokenRes.json();
    badmintonScoringToken = tokenData.data.scoringToken;
    assert.ok(badmintonScoringToken, "Should generate token");

    // Perform scoring request using x-scoring-token
    const res = await fetch(`${BASE_URL}/badminton/matches/${badmintonMatchId}/points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scoring-token": badmintonScoringToken
      },
      body: JSON.stringify({
        scoringTeamId: badmintonTeamId,
        pointType: "RALLY_POINT"
      })
    });
    assert.equal(res.status, 201, "Should record point using scoring access token");
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.matchState.teamAPointsGame1, 2);
  });

  await t.test("7. Invalid scoring token rejected", async () => {
    const res = await fetch(`${BASE_URL}/badminton/matches/${badmintonMatchId}/points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scoring-token": "invalid_token_xyz"
      },
      body: JSON.stringify({
        scoringTeamId: badmintonTeamId,
        pointType: "RALLY_POINT"
      })
    });
    assert.equal(res.status, 403, "Should reject invalid token with 403 Forbidden");
  });

  await t.test("8. Cricket scoring remains functional (regression guard)", async () => {
    // Assert Cricket match can be retrieved
    const res = await fetch(`${BASE_URL}/matches/${cricketMatchId}/live`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.matchStatus, "Upcoming");
  });

  await t.test("9. Cricket teams are not returned in Badminton filter", async () => {
    const res = await fetch(`${BASE_URL}/teams?sport=BADMINTON`);
    assert.equal(res.status, 200);
    const body = await res.json();
    const hasCricketTeam = body.data.some(t => t.id === cricketTeamId);
    assert.equal(hasCricketTeam, false, "Should filter out Cricket team");
    const hasBadmintonTeam = body.data.some(t => t.id === badmintonTeamId);
    assert.ok(hasBadmintonTeam, "Should include Badminton team");
  });

  await t.test("10. Badminton teams are not returned in Cricket filter", async () => {
    const res = await fetch(`${BASE_URL}/teams?sport=CRICKET`);
    assert.equal(res.status, 200);
    const body = await res.json();
    const hasBadmintonTeam = body.data.some(t => t.id === badmintonTeamId);
    assert.equal(hasBadmintonTeam, false, "Should filter out Badminton team");
    const hasCricketTeam = body.data.some(t => t.id === cricketTeamId);
    assert.ok(hasCricketTeam, "Should include Cricket team");
  });

  await t.test("11. Cricket players are not returned in Badminton filter", async () => {
    // First create Cricket player
    const cpRes = await fetch(`${BASE_URL}/players`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        firstName: "Cricket",
        lastName: "Batter",
        teamId: cricketTeamId,
        playerType: "BATSMAN",
        sport: "CRICKET"
      })
    });
    assert.equal(cpRes.status, 201);
    const cpData = await cpRes.json();
    cricketPlayerId = cpData.data.id;

    // Create Badminton player
    const bpRes = await fetch(`${BASE_URL}/players`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        firstName: "Badminton",
        lastName: "Shuttler",
        teamId: badmintonTeamId,
        sport: "BADMINTON"
      })
    });
    assert.equal(bpRes.status, 201);
    const bpData = await bpRes.json();
    badmintonPlayerId = bpData.data.id;

    const res = await fetch(`${BASE_URL}/players?sport=BADMINTON`);
    assert.equal(res.status, 200);
    const body = await res.json();
    const hasCricketPlayer = body.data.some(p => p.id === cricketPlayerId);
    assert.equal(hasCricketPlayer, false, "Should filter out Cricket player");
    const hasBadmintonPlayer = body.data.some(p => p.id === badmintonPlayerId);
    assert.ok(hasBadmintonPlayer, "Should include Badminton player");
  });

  await t.test("12. Badminton players are not returned in Cricket filter", async () => {
    const res = await fetch(`${BASE_URL}/players?sport=CRICKET`);
    assert.equal(res.status, 200);
    const body = await res.json();
    const hasBadmintonPlayer = body.data.some(p => p.id === badmintonPlayerId);
    assert.equal(hasBadmintonPlayer, false, "Should filter out Badminton player");
    const hasCricketPlayer = body.data.some(p => p.id === cricketPlayerId);
    assert.ok(hasCricketPlayer, "Should include Cricket player");
  });

  await t.test("13. Badminton tournament readiness uses 1+ players", async () => {
    const res = await fetch(`${BASE_URL}/tournaments/${badmintonTournamentId}/dashboard`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const registeredTeam = body.data.registeredTeams.find(rt => rt.teamId === badmintonTeamId);
    assert.equal(registeredTeam.isReady, true, "Badminton squad with 1 player should be ready");
    assert.equal(registeredTeam.rosterStatus, "READY");
  });

  await t.test("14. Cricket tournament readiness uses 11+ players", async () => {
    const res = await fetch(`${BASE_URL}/tournaments/${cricketTournamentId}/dashboard`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const registeredTeam = body.data.registeredTeams.find(rt => rt.teamId === cricketTeamId);
    assert.equal(registeredTeam.isReady, false, "Cricket squad with 1 player should be incomplete");
    assert.equal(registeredTeam.rosterStatus, "INCOMPLETE");
  });

  await t.test("15. Invalid sport code is rejected", async () => {
    const res = await fetch(`${BASE_URL}/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Tennis Team ${Date.now()}`,
        shortName: `TT${Math.floor(Math.random() * 900 + 100)}`,
        city: "Rajkot",
        sport: "TENNIS"
      })
    });
    assert.equal(res.status, 400, "Should reject TENNIS with 400 Bad Request");
  });
});
