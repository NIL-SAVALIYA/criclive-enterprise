import assert from "node:assert/strict";
import prisma from "../config/db.js";
import {
  registerManagerProfileService,
  getMyManagerProfileService,
  updateManagerProfileService,
  toggleManagerActiveStatusService,
  checkNicknameAvailabilityService,
  searchActiveManagersService,
  getManagerFixturesService
} from "../services/manager.service.js";
import {
  requestManagerAssignmentService,
  acceptManagerAssignmentService,
  declineManagerAssignmentService,
  cancelManagerAssignmentService,
  revokeManagerAssignmentService,
  getMatchManagerAssignmentsService
} from "../services/managerAssignment.service.js";
import {
  createPlayingXIService,
  getPlayingXIService
} from "../services/playingXI.service.js";
import { getProfile } from "../services/auth.service.js";

async function runManagerWorkflowTests() {
  console.log("🚀 Starting Manager Capabilities & Assignment Workflow Integration Tests...\n");

  const timestamp = Date.now();
  let viewerUser1, viewerUser2, organizerUser, adminUser;
  let teamAlpha, teamBeta, tournament, match;
  let managerProfile1, managerProfile2;
  let assignment1, assignment2;

  try {
    // 0. Setup Roles & Test Users
    console.log("📦 0. Setting up test roles, users, teams, and tournament fixture...");

    let viewerRole = await prisma.role.findUnique({ where: { name: "VIEWER" } });
    if (!viewerRole) {
      viewerRole = await prisma.role.create({ data: { name: "VIEWER" } });
    }
    let organizerRole = await prisma.role.findUnique({ where: { name: "ORGANIZER" } });
    if (!organizerRole) {
      organizerRole = await prisma.role.create({ data: { name: "ORGANIZER" } });
    }
    let adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: "ADMIN" } });
    }

    viewerUser1 = await prisma.user.create({
      data: {
        firstName: "Mike",
        lastName: "Manager",
        email: `mike.mgr.${timestamp}@test.com`,
        password: "hashedpassword",
        roleId: viewerRole.id
      }
    });

    viewerUser2 = await prisma.user.create({
      data: {
        firstName: "Sarah",
        lastName: "Coach",
        email: `sarah.coach.${timestamp}@test.com`,
        password: "hashedpassword",
        roleId: viewerRole.id
      }
    });

    organizerUser = await prisma.user.create({
      data: {
        firstName: "Oscar",
        lastName: "Organizer",
        email: `oscar.org.${timestamp}@test.com`,
        password: "hashedpassword",
        roleId: organizerRole.id
      }
    });

    adminUser = await prisma.user.create({
      data: {
        firstName: "System",
        lastName: "Admin",
        email: `sys.admin.${timestamp}@test.com`,
        password: "hashedpassword",
        roleId: adminRole.id
      }
    });

    // Create Tournament & Teams
    tournament = await prisma.tournament.create({
      data: {
        name: `Test Champions Cup ${timestamp}`,
        format: "LEAGUE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 7),
        organizerId: organizerUser.id
      }
    });

    teamAlpha = await prisma.team.create({
      data: {
        name: `Alpha Warriors ${timestamp}`,
        shortName: `AW${timestamp % 10000}`,
        city: "Mumbai"
      }
    });

    teamBeta = await prisma.team.create({
      data: {
        name: `Beta Challengers ${timestamp}`,
        shortName: `BC${timestamp % 10000}`,
        city: "Delhi"
      }
    });

    // Create 11 players for teamAlpha and teamBeta
    for (let i = 1; i <= 12; i++) {
      await prisma.player.create({
        data: {
          firstName: `AlphaPlayer`,
          lastName: `${i}`,
          playerType: "BATSMAN",
          battingStyle: "RIGHT_HAND",
          teamId: teamAlpha.id
        }
      });
      await prisma.player.create({
        data: {
          firstName: `BetaPlayer`,
          lastName: `${i}`,
          playerType: "BOWLER",
          bowlingStyle: "RIGHT_ARM_FAST",
          teamId: teamBeta.id
        }
      });
    }

    match = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        teamAId: teamAlpha.id,
        teamBId: teamBeta.id,
        venue: "Wankhede Stadium",
        matchDate: new Date(Date.now() + 86400000),
        status: "UPCOMING"
      }
    });

    console.log("   ✓ Base test environment initialized.\n");

    // ==========================================
    // 1. Nickname Format & Availability Checks
    // ==========================================
    console.log("🧪 1. Testing Nickname Availability & Validation...");

    const check1 = await checkNicknameAvailabilityService("MikeManager");
    assert.equal(check1.available, true, "Valid unused nickname should be available");

    const checkInvalid1 = await checkNicknameAvailabilityService("ab"); // < 3 chars
    assert.equal(checkInvalid1.available, false, "Short nickname should be rejected");

    const checkInvalid2 = await checkNicknameAvailabilityService("Mike Manager!"); // invalid chars
    assert.equal(checkInvalid2.available, false, "Nickname with spaces/symbols should be rejected");

    console.log("   ✓ Nickname format validation passed.");

    // ==========================================
    // 2. Manager Profile Registration & Uniqueness
    // ==========================================
    console.log("🧪 2. Testing Manager Profile Registration & Case-Insensitive Uniqueness...");

    managerProfile1 = await registerManagerProfileService(viewerUser1.id, {
      nickname: "MikeManager",
      displayName: "Coach Mike",
      city: "Mumbai",
      bio: "10 years club coaching experience."
    });

    assert.equal(managerProfile1.nickname, "MikeManager");
    assert.equal(managerProfile1.displayName, "Coach Mike");
    assert.equal(managerProfile1.isActive, true);

    // Case-Insensitive Uniqueness Check (attempting lowercase "mikemanager")
    await assert.rejects(
      async () => {
        await registerManagerProfileService(viewerUser2.id, {
          nickname: "mikemanager" // Duplicate normalized nickname
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        return true;
      },
      "Must reject duplicate lowercase nickname"
    );

    // Prevent duplicate profile on same user
    await assert.rejects(
      async () => {
        await registerManagerProfileService(viewerUser1.id, {
          nickname: "AnotherNick"
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        return true;
      },
      "Must reject registering a second profile for the same user"
    );

    // Register second manager
    managerProfile2 = await registerManagerProfileService(viewerUser2.id, {
      nickname: "SarahCoach",
      displayName: "Sarah Jenkins"
    });
    assert.equal(managerProfile2.nickname, "SarahCoach");

    console.log("   ✓ Case-insensitive uniqueness and single-profile rules passed.");

    // ==========================================
    // 3. User Profile Capability Integration
    // ==========================================
    console.log("🧪 3. Testing Unified User Profile Capability Return...");

    const userProfile1 = await getProfile(viewerUser1.id);
    assert.equal(userProfile1.isManager, true);
    assert.equal(userProfile1.managerProfile?.nickname, "MikeManager");

    const userProfileOrganizer = await getProfile(organizerUser.id);
    assert.equal(userProfileOrganizer.isManager, false);
    assert.equal(userProfileOrganizer.isOrganizer, true);

    console.log("   ✓ Unified user capabilities verified.");

    // ==========================================
    // 4. Search Active Managers
    // ==========================================
    console.log("🧪 4. Testing Manager Search (Excluding Normal Viewers & Admins)...");

    const searchResults = await searchActiveManagersService("mike");
    assert.equal(searchResults.length, 1);
    assert.equal(searchResults[0].nickname, "MikeManager");
    assert.equal(searchResults[0].userId, viewerUser1.id);

    // Search query with @ prefix
    const searchWithAt = await searchActiveManagersService("@SarahCoach");
    assert.equal(searchWithAt.length, 1);
    assert.equal(searchWithAt[0].nickname, "SarahCoach");

    // Deactivate manager 2 and confirm excluded from search
    await toggleManagerActiveStatusService(viewerUser2.id, false);
    const searchAfterDeactivate = await searchActiveManagersService("sarah");
    assert.equal(searchAfterDeactivate.length, 0, "Inactive manager must not appear in search");

    // Reactivate manager 2
    await toggleManagerActiveStatusService(viewerUser2.id, true);
    const searchAfterReactivate = await searchActiveManagersService("sarah");
    assert.equal(searchAfterReactivate.length, 1, "Reactivated manager must appear in search");

    console.log("   ✓ Manager search and active filtering passed.");

    // ==========================================
    // 5. Match-Specific Manager Assignment Lifecycle
    // ==========================================
    console.log("🧪 5. Testing Match-Specific Assignment Lifecycle...");

    // 5a. Organizer creates assignment request for Team A -> Manager 1
    assignment1 = await requestManagerAssignmentService(
      match.id,
      teamAlpha.id,
      managerProfile1.id,
      { userId: organizerUser.id, role: "ORGANIZER" }
    );
    assert.equal(assignment1.status, "PENDING");
    assert.equal(assignment1.teamId, teamAlpha.id);
    assert.equal(assignment1.matchId, match.id);

    // 5b. Prevent duplicate assignment request for same team
    await assert.rejects(
      async () => {
        await requestManagerAssignmentService(
          match.id,
          teamAlpha.id,
          managerProfile2.id,
          { userId: organizerUser.id, role: "ORGANIZER" }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      },
      "Must prevent duplicate active manager for the same team"
    );

    // 5c. Prevent assigning manager 1 to team B in the same match
    await assert.rejects(
      async () => {
        await requestManagerAssignmentService(
          match.id,
          teamBeta.id,
          managerProfile1.id,
          { userId: organizerUser.id, role: "ORGANIZER" }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      },
      "Must prevent assigning the same manager to both teams in one match"
    );

    // 5d. Manager 1 accepts assignment
    const acceptedAssignment1 = await acceptManagerAssignmentService(assignment1.id, {
      userId: viewerUser1.id,
      role: "VIEWER"
    });
    assert.equal(acceptedAssignment1.status, "ACCEPTED");
    assert.ok(acceptedAssignment1.acceptedAt);

    // 5e. Organizer assigns Manager 2 to Team B, then Manager 2 declines
    assignment2 = await requestManagerAssignmentService(
      match.id,
      teamBeta.id,
      managerProfile2.id,
      { userId: organizerUser.id, role: "ORGANIZER" }
    );
    assert.equal(assignment2.status, "PENDING");

    const declinedAssignment2 = await declineManagerAssignmentService(
      assignment2.id,
      { userId: viewerUser2.id, role: "VIEWER" },
      "Unavailable on match day"
    );
    assert.equal(declinedAssignment2.status, "DECLINED");
    assert.equal(declinedAssignment2.notes, "Unavailable on match day");

    // Test getMyManagerProfileService and updateManagerProfileService
    const myProfile = await getMyManagerProfileService(viewerUser1.id);
    assert.equal(myProfile.nickname, "MikeManager");

    const updatedProfile = await updateManagerProfileService(viewerUser1.id, {
      displayName: "Mike the Champion Coach",
      city: "Pune"
    });
    assert.equal(updatedProfile.displayName, "Mike the Champion Coach");
    assert.equal(updatedProfile.city, "Pune");

    // 5g. Test cancel and revoke lifecycle
    const matchAssignments = await getMatchManagerAssignmentsService(match.id);
    assert.ok(Array.isArray(matchAssignments));

    // Re-request manager 2 for Beta and accept
    const reAssignment2 = await requestManagerAssignmentService(
      match.id,
      teamBeta.id,
      managerProfile2.id,
      { userId: organizerUser.id, role: "ORGANIZER" }
    );
    await acceptManagerAssignmentService(reAssignment2.id, {
      userId: viewerUser2.id,
      role: "VIEWER"
    });

    // Test revoking reAssignment2
    const revoked = await revokeManagerAssignmentService(reAssignment2.id, {
      userId: organizerUser.id,
      role: "ORGANIZER"
    });
    assert.equal(revoked.status, "REVOKED");

    // Re-request and cancel
    const pendingToCancel = await requestManagerAssignmentService(
      match.id,
      teamBeta.id,
      managerProfile2.id,
      { userId: organizerUser.id, role: "ORGANIZER" }
    );
    const cancelled = await cancelManagerAssignmentService(pendingToCancel.id, {
      userId: organizerUser.id,
      role: "ORGANIZER"
    });
    assert.equal(cancelled.status, "CANCELLED");

    // Re-request and accept for XI test
    const finalAssignmentB = await requestManagerAssignmentService(
      match.id,
      teamBeta.id,
      managerProfile2.id,
      { userId: organizerUser.id, role: "ORGANIZER" }
    );
    await acceptManagerAssignmentService(finalAssignmentB.id, {
      userId: viewerUser2.id,
      role: "VIEWER"
    });

    console.log("   ✓ Manager assignment request, conflicts, accept, decline, cancel, and revoke lifecycle passed.");

    // ==========================================
    // 6. Playing XI Access Control
    // ==========================================
    console.log("🧪 6. Testing Playing XI Submission & Authorization...");

    const alphaPlayers = await prisma.player.findMany({ where: { teamId: teamAlpha.id }, take: 11 });
    const betaPlayers = await prisma.player.findMany({ where: { teamId: teamBeta.id }, take: 11 });

    const playingXIAlpha = alphaPlayers.map((p, idx) => ({
      playerId: p.id,
      battingOrder: idx + 1,
      isCaptain: idx === 0,
      isWicketKeeper: idx === 1
    }));

    // Unauthorized user (random viewer without assignment) tries to submit XI -> 403
    await assert.rejects(
      async () => {
        await createPlayingXIService(
          match.id,
          teamAlpha.id,
          playingXIAlpha,
          { userId: "unauthorized-user-id", role: "VIEWER" }
        );
      },
      (err) => {
        assert.equal(err.status || err.statusCode, 403);
        return true;
      },
      "Unauthorized user must receive 403 Forbidden"
    );

    // Manager 2 tries to submit XI for Team A (Manager 2 only manages Team B) -> 403
    await assert.rejects(
      async () => {
        await createPlayingXIService(
          match.id,
          teamAlpha.id,
          playingXIAlpha,
          { userId: viewerUser2.id, role: "VIEWER" }
        );
      },
      (err) => {
        assert.equal(err.status || err.statusCode, 403);
        return true;
      },
      "Manager of opposing team must receive 403 Forbidden"
    );

    // Authorized Manager 1 submits XI for Team A -> SUCCESS
    const submitResultA = await createPlayingXIService(
      match.id,
      teamAlpha.id,
      playingXIAlpha,
      { userId: viewerUser1.id, role: "VIEWER" }
    );
    assert.equal(submitResultA.message, "Playing XI created successfully.");

    // Authorized Manager 2 submits XI for Team B -> SUCCESS
    const playingXIBeta = betaPlayers.map((p, idx) => ({
      playerId: p.id,
      battingOrder: idx + 1,
      isCaptain: idx === 0,
      isWicketKeeper: idx === 1
    }));
    const submitResultB = await createPlayingXIService(
      match.id,
      teamBeta.id,
      playingXIBeta,
      { userId: viewerUser2.id, role: "VIEWER" }
    );
    assert.equal(submitResultB.message, "Playing XI created successfully.");

    // Verify Match Playing XI State
    const matchXIState = await getPlayingXIService(match.id);
    assert.equal(matchXIState.teamA.count, 11);
    assert.equal(matchXIState.teamB.count, 11);
    assert.equal(matchXIState.isReady, true);

    console.log("   ✓ Match Playing XI authorization and submission passed.");

    // ==========================================
    // 7. Manager Fixtures List Check
    // ==========================================
    console.log("🧪 7. Testing Manager Fixtures Listing...");

    const mgrFixtures = await getManagerFixturesService(viewerUser1.id);
    assert.equal(mgrFixtures.counts.upcoming, 1);
    assert.equal(mgrFixtures.upcoming[0].matchId, match.id);

    console.log("   ✓ Manager fixtures correctly returned.");

    console.log("\n🎉 ALL MANAGER WORKFLOW & CAPABILITIES TESTS PASSED SUCCESSFULLY! (100%)\n");
  } finally {
    // Cleanup test records safely
    try {
      if (match) {
        await prisma.playingXI.deleteMany({ where: { matchId: match.id } });
        await prisma.managerAssignment.deleteMany({ where: { matchId: match.id } });
        await prisma.match.deleteMany({ where: { id: match.id } });
      }
      if (tournament) {
        await prisma.tournament.deleteMany({ where: { id: tournament.id } });
      }
      if (teamAlpha) {
        await prisma.player.deleteMany({ where: { teamId: teamAlpha.id } });
        await prisma.team.deleteMany({ where: { id: teamAlpha.id } });
      }
      if (teamBeta) {
        await prisma.player.deleteMany({ where: { teamId: teamBeta.id } });
        await prisma.team.deleteMany({ where: { id: teamBeta.id } });
      }
      if (viewerUser1) {
        await prisma.managerProfile.deleteMany({ where: { userId: viewerUser1.id } });
        await prisma.user.deleteMany({ where: { id: viewerUser1.id } });
      }
      if (viewerUser2) {
        await prisma.managerProfile.deleteMany({ where: { userId: viewerUser2.id } });
        await prisma.user.deleteMany({ where: { id: viewerUser2.id } });
      }
      if (organizerUser) {
        await prisma.user.deleteMany({ where: { id: organizerUser.id } });
      }
      if (adminUser) {
        await prisma.user.deleteMany({ where: { id: adminUser.id } });
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }
}

runManagerWorkflowTests();
