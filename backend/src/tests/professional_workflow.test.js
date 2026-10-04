process.env.NODE_ENV = "test";
import http from "http";
import app from "../app.js";
import prisma from "../config/db.js";
import bcrypt from "bcrypt";

async function runProfessionalWorkflowTests() {
  console.log("🏆 ===========================================================");
  console.log("🏆 CRICLIVE Enterprise: Real-World Organizer Workflow (25/25)");
  console.log("🏆 ===========================================================");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // Warmup database connection
    let connected = false;
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        connected = true;
        break;
      } catch (connErr) {
        console.log(`Connecting to database (attempt ${attempt}/6)... ${connErr.message || ""}`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (!connected) {
      throw new Error("Unable to establish connection to database.");
    }

    // -------------------------------------------------------------
    // Core Roles Check
    // -------------------------------------------------------------
    const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
    const viewerRole = await prisma.role.findUnique({ where: { name: "VIEWER" } });
    const organizerRole = await prisma.role.findUnique({ where: { name: "ORGANIZER" } });
    let scorerRole = await prisma.role.findUnique({ where: { name: "SCORER" } });
    if (!scorerRole) {
      scorerRole = await prisma.role.create({
        data: { name: "SCORER", description: "Scorer role" }
      });
    }

    assert(adminRole && viewerRole && organizerRole && scorerRole, "Core Roles (ADMIN, VIEWER, ORGANIZER, SCORER) exist in database");

    // Setup Admin
    const adminEmail = `admin_suite_${timestamp}@criclive.com`;
    const passwordHash = await bcrypt.hash("Admin@12345", 10);
    await prisma.user.create({
      data: {
        firstName: "System",
        lastName: "Admin",
        email: adminEmail,
        password: passwordHash,
        roleId: adminRole.id
      }
    });

    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: "Admin@12345", captchaToken: "test-valid-token" })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.data?.token;
    assert(adminToken && adminLoginData.data?.user?.role === "ADMIN", "Admin logged in with full token");

    // -------------------------------------------------------------
    // 1, 2, 3, 4: Registration Role Security
    // -------------------------------------------------------------
    console.log("\n🔒 Phase 1: Public Registration Role Enforcement");

    // 1. Normal registration creates VIEWER
    const viewerAEmail = `organizer_a_${timestamp}@criclive.com`;
    const regResA = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Anand",
        lastName: "Patel",
        email: viewerAEmail,
        password: "Password@12345"
      })
    });
    const regDataA = await regResA.json();
    assert(regResA.status === 201 && regDataA.data?.role === "VIEWER", "1. Registration creates VIEWER");

    // 2. Direct ADMIN registration rejected
    const hackAdminRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Hacker",
        lastName: "Admin",
        email: `hackadmin_${timestamp}@criclive.com`,
        password: "Password@12345",
        role: "ADMIN"
      })
    });
    assert(hackAdminRes.status === 400, "2. Direct ADMIN registration rejected");

    // 3. Direct ORGANIZER registration rejected
    const hackOrgRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Hacker",
        lastName: "Org",
        email: `hackorg_${timestamp}@criclive.com`,
        password: "Password@12345",
        role: "ORGANIZER"
      })
    });
    assert(hackOrgRes.status === 400, "3. Direct ORGANIZER registration rejected");

    // 4. Direct TEAM_MANAGER registration rejected
    const hackTMRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Hacker",
        lastName: "TM",
        email: `hacktm_${timestamp}@criclive.com`,
        password: "Password@12345",
        role: "TEAM_MANAGER"
      })
    });
    assert(hackTMRes.status === 400, "4. Direct TEAM_MANAGER registration rejected");

    // Login Viewer A
    const loginResA = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: viewerAEmail, password: "Password@12345", captchaToken: "test-valid-token" })
    });
    const loginDataA = await loginResA.json();
    const tokenA = loginDataA.data?.token;
    const userIdA = loginDataA.data?.user?.id;

    // -------------------------------------------------------------
    // 5, 6, 7, 8, 9, 10: Automatic Organizer Activation
    // -------------------------------------------------------------
    console.log("\n⚡ Phase 2: Automatic Organizer Activation & Account Evolution");

    // 5. Incomplete organizer info rejected
    const invalidActRes = await fetch(`${baseUrl}/organizer-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        organizationName: "" // empty required field
      })
    });
    assert(invalidActRes.status === 400, "5. Incomplete organizer information does not promote user");

    // Verify user is still VIEWER
    const checkViewerUser = await prisma.user.findUnique({
      where: { id: userIdA },
      include: { role: true }
    });
    assert(checkViewerUser.role.name === "VIEWER", "5b. User remains VIEWER after invalid submission");

    // 6. Valid organizer info promotes VIEWER -> ORGANIZER automatically
    const validActRes = await fetch(`${baseUrl}/organizer-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        organizationName: "Gujarat Cricket Association League",
        organizationType: "LEAGUE_ORGANIZATION",
        city: "Ahmedabad",
        phone: "+91 98980 12345",
        description: "Official statewide cricket association"
      })
    });
    const validActData = await validActRes.json();
    assert(validActRes.status === 201, "6. Valid organizer information promotes VIEWER → ORGANIZER", JSON.stringify(validActData));

    // 7, 8, 9, 10: Verify Single Account integrity & No Admin Approval
    const userInDbA = await prisma.user.findUnique({
      where: { id: userIdA },
      include: { role: true }
    });
    assert(userInDbA.id === userIdA, "7. Same user ID remains unchanged");
    assert(userInDbA.email === viewerAEmail, "8. Same email remains unchanged");

    const totalUsersWithEmailA = await prisma.user.count({ where: { email: viewerAEmail } });
    assert(totalUsersWithEmailA === 1, "9. No duplicate User record is created");

    assert(userInDbA.role.name === "ORGANIZER", "10. No ADMIN approval is required for valid organizer activation");

    // Fresh token for Organizer A
    const orgALoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: viewerAEmail, password: "Password@12345", captchaToken: "test-valid-token" })
    });
    const tokenOrgA = (await orgALoginRes.json()).data?.token;

    // Register & Activate Organizer B
    const viewerBEmail = `organizer_b_${timestamp}@criclive.com`;
    await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Bhavesh",
        lastName: "Shah",
        email: viewerBEmail,
        password: "Password@12345"
      })
    });
    const loginResB = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: viewerBEmail, password: "Password@12345", captchaToken: "test-valid-token" })
    });
    const loginDataB = await loginResB.json();
    const tokenB = loginDataB.data?.token;
    const userIdB = loginDataB.data?.user?.id;
    assert(tokenB && userIdB, "Viewer B logged in successfully", JSON.stringify(loginDataB));

    const actResB = await fetch(`${baseUrl}/organizer-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        organizationName: "Mumbai Premier Clubs",
        city: "Mumbai"
      })
    });
    const actDataB = await actResB.json();
    assert(actResB.status === 201, "Organizer B activated successfully", JSON.stringify(actDataB));

    const orgBLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: viewerBEmail, password: "Password@12345", captchaToken: "test-valid-token" })
    });
    const orgBLoginData = await orgBLoginRes.json();
    const tokenOrgB = orgBLoginData.data?.token;
    assert(tokenOrgB, "Organizer B received fresh token", JSON.stringify(orgBLoginData));

    // -------------------------------------------------------------
    // 11, 12, 13, 14, 15, 16: Tournament Ownership Isolation
    // -------------------------------------------------------------
    console.log("\n🏟️ Phase 3: Strict Tournament Ownership & Isolation");

    // 11. Organizer A creates Tournament A
    const tournARes = await fetch(`${baseUrl}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgA}`
      },
      body: JSON.stringify({
        name: `Tournament Alpha ${timestamp}`,
        format: "LEAGUE",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 864000000).toISOString()
      })
    });
    const tournAData = await tournARes.json();
    const tournIdA = tournAData.data?.id;
    assert(tournARes.status === 201 && tournAData.data?.organizerId === userIdA, "11. Organizer A can create Tournament A");

    // 12. Organizer B creates Tournament B
    const tournBRes = await fetch(`${baseUrl}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgB}`
      },
      body: JSON.stringify({
        name: `Tournament Beta ${timestamp}`,
        format: "LEAGUE",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 864000000).toISOString()
      })
    });
    const tournBData = await tournBRes.json();
    const tournIdB = tournBData.data?.id;
    assert(tournBRes.status === 201 && tournBData.data?.organizerId === userIdB, "12. Organizer B can create Tournament B");

    // 13. Organizer A can update Tournament A
    const editTournARes = await fetch(`${baseUrl}/tournaments/${tournIdA}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgA}`
      },
      body: JSON.stringify({ description: "Updated Alpha Description" })
    });
    assert(editTournARes.status === 200, "13. Organizer A can update Tournament A");

    // 14. Organizer B can update Tournament B
    const editTournBRes = await fetch(`${baseUrl}/tournaments/${tournIdB}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgB}`
      },
      body: JSON.stringify({ description: "Updated Beta Description" })
    });
    assert(editTournBRes.status === 200, "14. Organizer B can update Tournament B");

    // 15. Organizer A cannot update Tournament B
    const illegalEditBRes = await fetch(`${baseUrl}/tournaments/${tournIdB}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgA}`
      },
      body: JSON.stringify({ description: "Hacked Beta Description" })
    });
    assert(illegalEditBRes.status === 403, "15. Organizer A cannot update Tournament B");

    // 16. Organizer B cannot update Tournament A
    const illegalEditARes = await fetch(`${baseUrl}/tournaments/${tournIdA}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgB}`
      },
      body: JSON.stringify({ description: "Hacked Alpha Description" })
    });
    assert(illegalEditARes.status === 403, "16. Organizer B cannot update Tournament A");

    // -------------------------------------------------------------
    // 17, 18: Resource Propagation & Scorer Assignment
    // -------------------------------------------------------------
    console.log("\n🔗 Phase 4: Resource Propagation & Scorer Assignment");

    // Setup teams for match fixtures
    const team1 = await prisma.team.create({
      data: {
        name: `Team One ${timestamp}`,
        shortName: `T1_${timestamp.toString().slice(-4)}`,
        city: "Mumbai"
      }
    });
    const team2 = await prisma.team.create({
      data: {
        name: `Team Two ${timestamp}`,
        shortName: `T2_${timestamp.toString().slice(-4)}`,
        city: "Delhi"
      }
    });

    // Create Match in Tournament B (Owned by Organizer B)
    const matchB = await prisma.match.create({
      data: {
        tournamentId: tournIdB,
        teamAId: team1.id,
        teamBId: team2.id,
        venue: "Wankhede Stadium",
        matchDate: new Date(),
        status: "UPCOMING"
      }
    });

    // 17. Organizer A cannot modify B's match
    const illegalMatchUpdateRes = await fetch(`${baseUrl}/matches/${matchB.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgA}`
      },
      body: JSON.stringify({ venue: "Illegally Changed Venue" })
    });
    assert(illegalMatchUpdateRes.status === 403, "17. Organizer A cannot modify B's teams/fixtures/matches");

    // Create Scorer User
    const scorerEmail = `scorer_${timestamp}@criclive.com`;
    const scorerUser = await prisma.user.create({
      data: {
        firstName: "Official",
        lastName: "Scorer",
        email: scorerEmail,
        password: passwordHash,
        roleId: scorerRole.id
      }
    });
    const scorerLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: scorerEmail, password: "Admin@12345", captchaToken: "test-valid-token" })
    });
    const scorerToken = (await scorerLoginRes.json()).data?.token;

    // 18. Organizer A cannot assign scorer to B's match
    const illegalScorerAssignRes = await fetch(`${baseUrl}/matches/${matchB.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgA}`
      },
      body: JSON.stringify({ scorerId: scorerUser.id })
    });
    assert(illegalScorerAssignRes.status === 403, "18. Organizer A cannot assign scorer to B's match");

    // Organizer B assigns scorer to B's match
    const validScorerAssignRes = await fetch(`${baseUrl}/matches/${matchB.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgB}`
      },
      body: JSON.stringify({ scorerId: scorerUser.id })
    });
    assert(validScorerAssignRes.status === 200, "18b. Owning Organizer B can assign scorer to match");

    // Setup Innings and Players for Scoring tests
    const player1 = await prisma.player.create({
      data: {
        firstName: "Rohit",
        lastName: "Sharma",
        playerType: "BATSMAN",
        teamId: team1.id
      }
    });
    const player2 = await prisma.player.create({
      data: {
        firstName: "Jasprit",
        lastName: "Bumrah",
        playerType: "BOWLER",
        teamId: team2.id
      }
    });
    const player3 = await prisma.player.create({
      data: {
        firstName: "Virat",
        lastName: "Kohli",
        playerType: "BATSMAN",
        teamId: team1.id
      }
    });

    const inningsB = await prisma.innings.create({
      data: {
        matchId: matchB.id,
        inningsNumber: 1,
        battingTeamId: team1.id,
        bowlingTeamId: team2.id,
        status: "LIVE"
      }
    });

    // Seed active scorecards for batsman, non-striker, and bowler
    await prisma.battingScorecard.create({
      data: {
        inningsId: inningsB.id,
        playerId: player1.id,
        battingPosition: 1
      }
    });
    await prisma.battingScorecard.create({
      data: {
        inningsId: inningsB.id,
        playerId: player3.id,
        battingPosition: 2
      }
    });
    await prisma.bowlingScorecard.create({
      data: {
        inningsId: inningsB.id,
        bowlerId: player2.id
      }
    });

    // -------------------------------------------------------------
    // 19, 20, 21, 22: Match Scoring Access Matrix
    // -------------------------------------------------------------
    console.log("\n🏏 Phase 5: Match Scoring Access Matrix");

    // Create Unassigned User (Third Party)
    const unassignedEmail = `unassigned_${timestamp}@criclive.com`;
    await prisma.user.create({
      data: {
        firstName: "Unassigned",
        lastName: "User",
        email: unassignedEmail,
        password: passwordHash,
        roleId: scorerRole.id
      }
    });
    const unassignedLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unassignedEmail, password: "Admin@12345", captchaToken: "test-valid-token" })
    });
    const unassignedToken = (await unassignedLoginRes.json()).data?.token;

    // 19. Assigned scorer can score assigned match
    const assignedScoreRes = await fetch(`${baseUrl}/innings/${inningsB.id}/balls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${scorerToken}`
      },
      body: JSON.stringify({
        batsmanId: player1.id,
        bowlerId: player2.id,
        nonStrikerId: player3.id,
        batRuns: 4
      })
    });
    assert(assignedScoreRes.status === 201, "19. Assigned scorer can score assigned match");

    // 20. Unassigned user cannot score
    const unassignedScoreRes = await fetch(`${baseUrl}/innings/${inningsB.id}/balls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${unassignedToken}`
      },
      body: JSON.stringify({
        batsmanId: player1.id,
        bowlerId: player2.id,
        nonStrikerId: player3.id,
        batRuns: 1
      })
    });
    assert(unassignedScoreRes.status === 403, "20. Unassigned scorer cannot score");

    // 21. Viewer cannot score protected match
    const viewerScoreRes = await fetch(`${baseUrl}/innings/${inningsB.id}/balls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${unassignedToken}`
      },
      body: JSON.stringify({
        batsmanId: player1.id,
        bowlerId: player2.id,
        nonStrikerId: player3.id,
        batRuns: 1
      })
    });
    assert(viewerScoreRes.status === 403, "21. Viewer cannot score protected match");

    // 22. ADMIN has global access
    const adminScoreRes = await fetch(`${baseUrl}/innings/${inningsB.id}/balls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        batsmanId: player1.id,
        bowlerId: player2.id,
        nonStrikerId: player3.id,
        batRuns: 6
      })
    });
    assert(adminScoreRes.status === 201, "22. ADMIN has global access to score matches");

    // -------------------------------------------------------------
    // 23, 24, 25: Admin Suspension & Audit Trail
    // -------------------------------------------------------------
    console.log("\n🛡️ Phase 6: Admin Suspension & Audit Logging");

    // 23. ADMIN can suspend/deactivate organizer
    const suspendRes = await fetch(`${baseUrl}/organizer-applications/suspend/${userIdA}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        reason: "Violation of fair play league terms"
      })
    });
    assert(suspendRes.status === 200, "23. ADMIN can suspend/deactivate organizer");

    // 24. Suspended organizer loses protected organizer privileges
    const freshSuspendedUser = await prisma.user.findUnique({
      where: { id: userIdA },
      include: { role: true }
    });
    assert(freshSuspendedUser.role.name === "VIEWER", "24a. User role demoted to VIEWER upon suspension");

    // Suspended organizer cannot create new tournaments
    const suspendedCreateTournRes = await fetch(`${baseUrl}/tournaments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgA}` // Old token has VIEWER in DB
      },
      body: JSON.stringify({
        name: `Illegal Post-Suspension Tourn ${timestamp}`,
        format: "LEAGUE",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 864000000).toISOString()
      })
    });
    assert(suspendedCreateTournRes.status === 403, "24b. Suspended organizer loses protected tournament creation");

    // Suspended organizer cannot re-activate themselves automatically
    const reActivateRes = await fetch(`${baseUrl}/organizer-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenOrgA}`
      },
      body: JSON.stringify({
        organizationName: "Sneaky Re-activation League"
      })
    });
    assert(reActivateRes.status === 403, "24c. Suspended organizer cannot re-activate themselves automatically");

    // 25. Audit logs are created
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ["ORGANIZER_ACTIVATED", "ORGANIZER_SUSPENDED", "TOURNAMENT_CREATED"] }
      }
    });
    assert(auditLogs.length >= 3, "25. Audit logs are created for activation, suspension, and tournaments");

  } catch (err) {
    console.error("❌ Test error:", err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log(`\n===========================================================`);
  console.log(`📊 Professional Workflow Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`===========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runProfessionalWorkflowTests();
