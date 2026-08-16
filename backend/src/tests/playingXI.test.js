import http from "http";
import jwt from "jsonwebtoken";
import app from "../app.js";
import env from "../config/env.js";
import prisma from "../config/db.js";
import { Roles } from "../constants/roles.js";

async function runPlayingXITests() {
  console.log("🧪 Starting Playing XI Phase 1 Verification Test Suite...\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1/matches`;

  const adminToken = jwt.sign({ userId: "test-admin-id", role: Roles.ADMIN }, env.JWT_SECRET);
  const scorerToken = jwt.sign({ userId: "test-scorer-id", role: Roles.SCORER }, env.JWT_SECRET);
  const viewerToken = jwt.sign({ userId: "test-viewer-id", role: Roles.VIEWER }, env.JWT_SECRET);

  let passed = 0;
  let failed = 0;

  async function assertCase(name, condition) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. Setup temporary test fixtures in database
    const teamA = await prisma.team.upsert({
      where: { name: "Test Team Alpha" },
      update: {},
      create: { name: "Test Team Alpha", shortName: "TTA", city: "City A" }
    });

    const teamB = await prisma.team.upsert({
      where: { name: "Test Team Beta" },
      update: {},
      create: { name: "Test Team Beta", shortName: "TTB", city: "City B" }
    });

    const teamC = await prisma.team.upsert({
      where: { name: "Test Team Gamma" },
      update: {},
      create: { name: "Test Team Gamma", shortName: "TTG", city: "City C" }
    });

    const tournament = await prisma.tournament.upsert({
      where: { name: "Test Tournament XI" },
      update: {},
      create: {
        name: "Test Tournament XI",
        format: "LEAGUE",
        startDate: new Date(),
        endDate: new Date()
      }
    });

    const upcomingMatch = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        venue: "Test Stadium Alpha",
        matchDate: new Date(),
        status: "UPCOMING"
      }
    });

    const liveMatch = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        venue: "Test Stadium Live",
        matchDate: new Date(),
        status: "LIVE"
      }
    });

    // Create 11 players for teamA
    const playersTeamA = [];
    for (let i = 1; i <= 11; i++) {
      const p = await prisma.player.create({
        data: {
          firstName: `PlayerA${i}`,
          lastName: "Test",
          jerseyNumber: i,
          playerType: "BATSMAN",
          teamId: teamA.id
        }
      });
      playersTeamA.push(p);
    }

    const validPayloadTeamA = {
      teamId: teamA.id,
      players: playersTeamA.map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx === 0,
        isWicketKeeper: idx === 1
      }))
    };

    // --- TEST SUITE EXECUTION ---

    // TC-SEC-01: Unauthenticated POST -> 401
    const res1 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayloadTeamA)
    });
    const data1 = await res1.json();
    assertCase("TC-SEC-01: Unauthenticated POST returns 401", res1.status === 401 && data1.success === false);

    // TC-SEC-02: Unauthorized role (VIEWER) -> 403
    const res2 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${viewerToken}`
      },
      body: JSON.stringify(validPayloadTeamA)
    });
    const data2 = await res2.json();
    assertCase("TC-SEC-02: Unauthorized role (VIEWER) returns 403", res2.status === 403 && data2.success === false);

    // TC-RULE-05: Team not part of match (teamC) -> 400
    const res3 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        teamId: teamC.id,
        players: validPayloadTeamA.players
      })
    });
    const data3 = await res3.json();
    assertCase("TC-RULE-05: Team not in match returns 400 (Selected team is not part of this match)", res3.status === 400 && data3.message?.includes("Selected team is not part of this match"));

    // TC-RULE-10: Match with status LIVE -> 400
    const res4 = await fetch(`${baseUrl}/${liveMatch.id}/playing-xi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify(validPayloadTeamA)
    });
    const data4 = await res4.json();
    assertCase("TC-RULE-10: Match not UPCOMING returns 400 (Cannot set Playing XI for match)", res4.status === 400 && data4.message?.includes("Cannot set Playing XI"));

    // Match not found -> 404
    const res5 = await fetch(`${baseUrl}/00000000-0000-0000-0000-000000000000/playing-xi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify(validPayloadTeamA)
    });
    const data5 = await res5.json();
    assertCase("TC-RULE-MATCH-404: Non-existent match returns 404", res5.status === 404 && data5.message?.includes("Match not found"));

    // TC-SEC-03: Authorized role (ADMIN) with valid data on UPCOMING match -> 201
    const res6 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify(validPayloadTeamA)
    });
    const data6 = await res6.json();
    assertCase("TC-SEC-03: Authorized role (ADMIN) saves Playing XI with 201 Created", res6.status === 201 && data6.success === true);

    // TC-SEC-03b: Authorized role (SCORER) verified with valid token
    const res7 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${scorerToken}`
      },
      body: JSON.stringify(validPayloadTeamA)
    });
    const data7 = await res7.json();
    assertCase("TC-SEC-03b: Authorized role (SCORER) passes auth & RBAC (reaches service)", res7.status !== 401 && res7.status !== 403 && (res7.status === 201 || data7.message?.includes("already exists")));

    // --- PHASE 2 GET PLAYING XI TESTS ---

    // TC-GET-04: Publicly readable without auth token on match with saved XI -> 200
    const resGet1 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`);
    const dataGet1 = await resGet1.json();
    assertCase("TC-GET-04: GET Playing XI is publicly readable without auth token", resGet1.status === 200 && dataGet1.success === true);

    // TC-GET-01: Returns 200 with saved players
    assertCase("TC-GET-01: GET Playing XI returns 200 with match data", resGet1.status === 200 && dataGet1.data?.teamA?.players?.length === 11);

    // TC-GET-05: Returned data contains saved batting order/captain/wicketkeeper
    const firstPlayer = dataGet1.data?.teamA?.players?.[0];
    const secondPlayer = dataGet1.data?.teamA?.players?.[1];
    assertCase(
      "TC-GET-05: Returned data contains saved batting order, captain, and wicketkeeper flags",
      firstPlayer?.battingOrder === 1 &&
      firstPlayer?.isCaptain === true &&
      secondPlayer?.battingOrder === 2 &&
      secondPlayer?.isWicketKeeper === true &&
      firstPlayer?.player?.firstName !== undefined
    );

    // TC-GET-02: GET Playing XI for match with no XI -> 200 with empty data
    const resGet2 = await fetch(`${baseUrl}/${liveMatch.id}/playing-xi`);
    const dataGet2 = await resGet2.json();
    assertCase(
      "TC-GET-02: GET Playing XI for match with no XI returns 200 with empty players list",
      resGet2.status === 200 &&
      dataGet2.success === true &&
      dataGet2.data?.teamA?.players?.length === 0 &&
      dataGet2.data?.playingXI?.length === 0
    );

    // TC-GET-03: GET Playing XI for non-existent match -> 404
    const resGet3 = await fetch(`${baseUrl}/00000000-0000-0000-0000-000000000000/playing-xi`);
    const dataGet3 = await resGet3.json();
    assertCase(
      "TC-GET-03: GET Playing XI for non-existent match returns 404",
      resGet3.status === 404 && dataGet3.message?.includes("Match not found")
    );

    // Create 11 players for teamB and 1 extra player for teamA
    const playersTeamB = [];
    for (let i = 1; i <= 11; i++) {
      const p = await prisma.player.create({
        data: {
          firstName: `PlayerB${i}`,
          lastName: "Test",
          jerseyNumber: i,
          playerType: "BATSMAN",
          teamId: teamB.id
        }
      });
      playersTeamB.push(p);
    }

    const playerExtraA = await prisma.player.create({
      data: {
        firstName: "PlayerAExtra",
        lastName: "Sub",
        jerseyNumber: 99,
        playerType: "ALL_ROUNDER",
        teamId: teamA.id
      }
    });

    const completedMatch = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        venue: "Test Stadium Completed",
        matchDate: new Date(),
        status: "COMPLETED"
      }
    });

    const validPayloadTeamB = {
      teamId: teamB.id,
      players: playersTeamB.map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx === 0,
        isWicketKeeper: idx === 1
      }))
    };

    // --- PHASE 3 PUT PLAYING XI TESTS ---

    // TC-PUT-01: Unauthenticated PUT -> 401
    const resPut1 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayloadTeamA)
    });
    const dataPut1 = await resPut1.json();
    assertCase("TC-PUT-01: Unauthenticated PUT returns 401", resPut1.status === 401 && dataPut1.success === false);

    // TC-PUT-02: VIEWER PUT -> 403
    const resPut2 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${viewerToken}`
      },
      body: JSON.stringify(validPayloadTeamA)
    });
    const dataPut2 = await resPut2.json();
    assertCase("TC-PUT-02: VIEWER PUT returns 403 Forbidden", resPut2.status === 403 && dataPut2.success === false);

    // TC-PUT-03: Non-existent match -> 404
    const resPut3 = await fetch(`${baseUrl}/00000000-0000-0000-0000-000000000000/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify(validPayloadTeamA)
    });
    const dataPut3 = await resPut3.json();
    assertCase("TC-PUT-03: Non-existent match returns 404", resPut3.status === 404 && dataPut3.message?.includes("Match not found"));

    // TC-PUT-04: Team not belonging to match -> 400
    const resPut4 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        teamId: teamC.id,
        players: validPayloadTeamA.players
      })
    });
    const dataPut4 = await resPut4.json();
    assertCase("TC-PUT-04: Team not belonging to match returns 400", resPut4.status === 400 && dataPut4.message?.includes("Selected team is not part of this match"));

    // TC-PUT-05: LIVE match -> 400
    const resPut5 = await fetch(`${baseUrl}/${liveMatch.id}/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify(validPayloadTeamA)
    });
    const dataPut5 = await resPut5.json();
    assertCase("TC-PUT-05: LIVE match returns 400 (Cannot modify Playing XI)", resPut5.status === 400 && dataPut5.message?.includes("Cannot modify Playing XI"));

    // TC-PUT-06: COMPLETED match -> 400
    const resPut6 = await fetch(`${baseUrl}/${completedMatch.id}/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify(validPayloadTeamA)
    });
    const dataPut6 = await resPut6.json();
    assertCase("TC-PUT-06: COMPLETED match returns 400", resPut6.status === 400 && dataPut6.message?.includes("Cannot modify Playing XI"));

    // TC-PUT-08: Valid new XI can be created through PUT when none exists -> 200
    const resPut8 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify(validPayloadTeamB)
    });
    const dataPut8 = await resPut8.json();
    assertCase("TC-PUT-08: Valid new XI created through PUT when none exists -> 200", resPut8.status === 200 && dataPut8.success === true);

    // TC-PUT-09: Invalid XI validation still fails (e.g. fewer than 11 players)
    const resPut9 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        teamId: teamA.id,
        players: validPayloadTeamA.players.slice(0, 10) // Only 10 players
      })
    });
    const dataPut9 = await resPut9.json();
    assertCase("TC-PUT-09: Invalid XI validation fails (10 players) -> 400", resPut9.status === 400 && dataPut9.success === false);

    // TC-PUT-07: Valid existing XI can be replaced (swap player 11 with playerExtraA) -> 200
    const updatedTeamAPlayers = [
      ...validPayloadTeamA.players.slice(0, 10),
      {
        playerId: playerExtraA.id,
        battingOrder: 11,
        isCaptain: false,
        isWicketKeeper: false
      }
    ];

    const resPut7 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${scorerToken}`
      },
      body: JSON.stringify({
        teamId: teamA.id,
        players: updatedTeamAPlayers
      })
    });
    const dataPut7 = await resPut7.json();
    assertCase("TC-PUT-07: Valid existing XI replaced via PUT by SCORER -> 200", resPut7.status === 200 && dataPut7.success === true);

    // TC-PUT-10: After replacement, GET returns the new XI and does not contain duplicate old rows
    const resGetAfter = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`);
    const dataGetAfter = await resGetAfter.json();
    const currentTeamAPlayers = dataGetAfter.data?.teamA?.players || [];
    const hasPlayerExtra = currentTeamAPlayers.some(p => p.playerId === playerExtraA.id);
    const hasOldPlayer11 = currentTeamAPlayers.some(p => p.playerId === playersTeamA[10].id);

    assertCase(
      "TC-PUT-10: After replacement, GET returns new XI (11 players, new player present, old player removed)",
      currentTeamAPlayers.length === 11 && hasPlayerExtra && !hasOldPlayer11
    );

    // TC-PUT-11: Database remains consistent if replacement fails (transaction rollback)
    const resPut11 = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        teamId: teamA.id,
        players: [
          ...validPayloadTeamA.players.slice(0, 10),
          {
            playerId: "00000000-0000-0000-0000-000000000000", // Non-existent player
            battingOrder: 11,
            isCaptain: false,
            isWicketKeeper: false
          }
        ]
      })
    });
    assertCase("TC-PUT-11a: Failing replacement request is rejected", resPut11.status === 400);

    const resGetRollback = await fetch(`${baseUrl}/${upcomingMatch.id}/playing-xi`);
    const dataGetRollback = await resGetRollback.json();
    const rollbackTeamAPlayers = dataGetRollback.data?.teamA?.players || [];
    assertCase(
      "TC-PUT-11b: Database remains consistent with previous valid XI after failed replacement",
      rollbackTeamAPlayers.length === 11 && rollbackTeamAPlayers.some(p => p.playerId === playerExtraA.id)
    );

    // Clean up test data
    await prisma.playingXI.deleteMany({ where: { matchId: { in: [upcomingMatch.id, liveMatch.id, completedMatch.id] } } });
    await prisma.match.deleteMany({ where: { id: { in: [upcomingMatch.id, liveMatch.id, completedMatch.id] } } });
    await prisma.player.deleteMany({ where: { id: { in: [...playersTeamA.map((p) => p.id), ...playersTeamB.map((p) => p.id), playerExtraA.id] } } });
    await prisma.tournament.delete({ where: { id: tournament.id } });
    await prisma.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id, teamC.id] } } });

  } catch (err) {
    console.error("❌ Test suite encountered error:", err);
    failed++;
  } finally {
    server.close();
    console.log(`\n📊 Playing XI Verification Test Summary: ${passed} Passed, ${failed} Failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPlayingXITests();
