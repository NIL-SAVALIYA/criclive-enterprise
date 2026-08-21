import prisma from "../config/db.js";
import app from "../app.js";
import http from "http";

async function runTest() {
  console.log("🏏 Running End-to-End TEAM_MANAGER Playing XI Workflow Test Suite...\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  let passed = 0;
  let failed = 0;

  function assert(title, condition, extra = "") {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} ${extra ? `-> ${JSON.stringify(extra)}` : ""}`);
      failed++;
    }
  }

  try {
    // 1. Manager Login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "mgr1_ops_223455@criclive.test",
        password: "Manager@123",
        captchaToken: "test-valid-token"
      })
    });
    const loginData = await loginRes.json();
    assert("1. Manager Login returns 200 and valid JWT token", loginRes.status === 200 && Boolean(loginData.data?.token));
    const managerToken = loginData.data?.token;
    const managerUser = loginData.data?.user;

    assert("2. Manager role is TEAM_MANAGER", managerUser?.role === "TEAM_MANAGER");

    // 2. Fetch Teams and locate Manager's Assigned Team
    const teamsRes = await fetch(`${baseUrl}/teams`);
    const teamsData = await teamsRes.json();
    assert("3. GET /teams returns list of teams", teamsRes.status === 200 && Array.isArray(teamsData.data));

    const managerTeam = teamsData.data.find(
      (t) => t.managerId === managerUser.id || t.manager?.id === managerUser.id
    );
    assert("4. Manager's assigned team identified", Boolean(managerTeam), { managerId: managerUser.id, team: managerTeam?.name });

    // 3. Fetch Team Roster
    const teamDetailsRes = await fetch(`${baseUrl}/teams/${managerTeam.id}`);
    const teamDetails = await teamDetailsRes.json();
    const players = teamDetails.data?.players || [];
    assert("5. Team details include squad roster with >= 11 players", players.length >= 11, { count: players.length });

    // Find or create an UPCOMING match for this team
    let upcomingMatch = await prisma.match.findFirst({
      where: {
        status: "UPCOMING",
        OR: [{ teamAId: managerTeam.id }, { teamBId: managerTeam.id }]
      },
      include: { teamA: true, teamB: true }
    });

    if (!upcomingMatch) {
      // Find opponent team
      const opponentTeam = await prisma.team.findFirst({
        where: { id: { not: managerTeam.id } }
      });

      // Ensure opponent has 11 players
      const oppPlayersCount = await prisma.player.count({ where: { teamId: opponentTeam.id } });
      if (oppPlayersCount < 11) {
        for (let i = oppPlayersCount; i < 11; i++) {
          await prisma.player.create({
            data: {
              firstName: `OppPlayer_${i}`,
              lastName: "Test",
              jerseyNumber: 10 + i,
              playerType: "BATSMAN",
              battingStyle: "Right Hand",
              teamId: opponentTeam.id
            }
          });
        }
      }

      let tourn = await prisma.tournament.findFirst();
      if (!tourn) {
        tourn = await prisma.tournament.create({
          data: {
            name: `Test Tournament ${Date.now()}`,
            format: "LEAGUE",
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            status: "UPCOMING"
          }
        });
      }

      upcomingMatch = await prisma.match.create({
        data: {
          tournamentId: tourn.id,
          teamAId: managerTeam.id,
          teamBId: opponentTeam.id,
          venue: "Test Manager Arena",
          matchDate: new Date(Date.now() + 86400000),
          status: "UPCOMING"
        },
        include: { teamA: true, teamB: true }
      });
    }

    assert("6. UPCOMING match fixture located for manager's team", Boolean(upcomingMatch), {
      matchId: upcomingMatch.id,
      teamA: upcomingMatch.teamA?.name,
      teamB: upcomingMatch.teamB?.name
    });

    // 4. Test RBAC: Manager submitting for an UNASSIGNED other team -> 403
    const otherTeam = await prisma.team.findFirst({
      where: { id: { not: managerTeam.id } },
      include: { players: true }
    });

    const invalidOtherTeamPlayers = otherTeam.players.slice(0, 11).map((p, idx) => ({
      playerId: p.id,
      battingOrder: idx + 1,
      isCaptain: idx === 0,
      isWicketKeeper: idx === 1
    }));

    if (invalidOtherTeamPlayers.length === 11) {
      const unauthorizedRes = await fetch(`${baseUrl}/matches/${upcomingMatch.id}/playing-xi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${managerToken}`
        },
        body: JSON.stringify({
          teamId: otherTeam.id,
          players: invalidOtherTeamPlayers
        })
      });
      assert("7. Manager cannot submit Playing XI for another team (403 Forbidden)", unauthorizedRes.status === 403);
    }

    // 5. Test Validations: 10 players -> 400
    const tenPlayersPayload = {
      teamId: managerTeam.id,
      players: players.slice(0, 10).map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx === 0,
        isWicketKeeper: false
      }))
    };

    const tenPlayersRes = await fetch(`${baseUrl}/matches/${upcomingMatch.id}/playing-xi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${managerToken}`
      },
      body: JSON.stringify(tenPlayersPayload)
    });
    assert("8. Playing XI with 10 players fails validation (400 Bad Request)", tenPlayersRes.status === 400);

    // 6. Test Validations: 2 captains -> 400
    const twoCaptainsPayload = {
      teamId: managerTeam.id,
      players: players.slice(0, 11).map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx < 2, // 2 captains!
        isWicketKeeper: false
      }))
    };

    const twoCaptainsRes = await fetch(`${baseUrl}/matches/${upcomingMatch.id}/playing-xi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${managerToken}`
      },
      body: JSON.stringify(twoCaptainsPayload)
    });
    assert("9. Playing XI with 2 captains fails validation (400 Bad Request)", twoCaptainsRes.status === 400);

    // 7. Test Valid Submission: 11 players, 1 captain, 1 wicketkeeper, batting orders 1-11
    const validManagerXI = {
      teamId: managerTeam.id,
      players: players.slice(0, 11).map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx === 0,
        isWicketKeeper: idx === 1,
        isSubstitute: false
      }))
    };

    const validSubmissionRes = await fetch(`${baseUrl}/matches/${upcomingMatch.id}/playing-xi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${managerToken}`
      },
      body: JSON.stringify(validManagerXI)
    });
    const validData = await validSubmissionRes.json();
    assert("10. Manager valid Playing XI submission returns 201 Created", validSubmissionRes.status === 201, validData);

    // 8. Test Persistence via GET
    const getXIRes = await fetch(`${baseUrl}/matches/${upcomingMatch.id}/playing-xi`);
    const getXIData = await getXIRes.json();
    assert("11. GET /matches/:id/playing-xi returns 200 OK", getXIRes.status === 200);

    const isTeamA = upcomingMatch.teamAId === managerTeam.id;
    const submittedXI = isTeamA ? getXIData.data?.teamA : getXIData.data?.teamB;
    assert("12. Playing XI for manager's team contains exactly 11 players", submittedXI?.players?.length === 11, { count: submittedXI?.players?.length });

    const captain = submittedXI?.players?.find((p) => p.isCaptain);
    assert("13. Submitted captain is accurately persisted", captain?.playerId === players[0].id);

    const wicketKeeper = submittedXI?.players?.find((p) => p.isWicketKeeper);
    assert("14. Submitted wicketkeeper is accurately persisted", wicketKeeper?.playerId === players[1].id);

    // 9. Test Re-submission / Update via POST or PUT
    const reorderedPlayers = [
      ...players.slice(1, 11),
      players[0]
    ].map((p, idx) => ({
      playerId: p.id,
      battingOrder: idx + 1,
      isCaptain: p.id === players[0].id,
      isWicketKeeper: p.id === players[1].id,
      isSubstitute: false
    }));

    const updateRes = await fetch(`${baseUrl}/matches/${upcomingMatch.id}/playing-xi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        teamId: managerTeam.id,
        players: reorderedPlayers
      })
    });
    assert("15. Manager updating Playing XI via PUT returns 200 OK", updateRes.status === 200);

    // 10. Verify updated batting order in GET
    const getUpdatedRes = await fetch(`${baseUrl}/matches/${upcomingMatch.id}/playing-xi`);
    const getUpdatedData = await getUpdatedRes.json();
    const updatedSubmittedXI = isTeamA ? getUpdatedData.data?.teamA : getUpdatedData.data?.teamB;
    const lastBatter = updatedSubmittedXI?.players?.find((p) => p.battingOrder === 11);
    assert("16. Updated batting order is persisted and reflected in GET", lastBatter?.playerId === players[0].id);

    console.log(`\n======================================================`);
    console.log(`📊 TEAM_MANAGER Workflow Test Results: ${passed} Passed, ${failed} Failed.`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    failed++;
  } finally {
    await server.close();
    await prisma.$disconnect();
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTest();
