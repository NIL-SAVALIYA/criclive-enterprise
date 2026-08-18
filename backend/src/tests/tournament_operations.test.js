import { describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "../config/db.js";
import {
  createTournamentService,
  getTournamentDashboardService,
  updateTournamentService
} from "../services/tournament.service.js";
import {
  registerTeamService,
  getTournamentTeamsService
} from "../services/tournament-team.service.js";
import { generateFixturesService } from "../services/fixture.service.js";
import { createTeamService, updateTeamService } from "../services/team.service.js";
import {
  updateMatchService,
  getAllMatchesService,
  generateScoringTokenService,
  revokeScoringTokenService,
  getScoringTokenService,
  getMatchByScoringTokenService
} from "../services/match.service.js";
import {
  createPlayingXIService
} from "../services/playingXI.service.js";
import { startMatch } from "../services/startMatch.service.js";
import { evaluateMatchResult } from "../engine/matchResult.engine.js";
import { getPointsTableService } from "../services/pointsTable.service.js";
import { Roles } from "../constants/roles.js";

async function getOrCreateRole(name) {
  let role = await prisma.role.findFirst({ where: { name } });
  if (!role) {
    role = await prisma.role.create({
      data: { name, description: `${name} role` }
    });
  }
  return role;
}

describe("Real-World Organizer Tournament Operations Test Suite", () => {
  let adminRole, organizerRole, scorerRole, teamManagerRole, viewerRole;
  let adminUser, organizer1, organizer2, scorerUser, managerUser1, managerUser2, viewerUser;
  let tournament1, tournament2;
  let teamAlpha, teamBeta, teamGamma, teamDelta;

  it("0. Setup test users and roles in database", async () => {
    [adminRole, organizerRole, scorerRole, teamManagerRole, viewerRole] = await Promise.all([
      getOrCreateRole(Roles.ADMIN),
      getOrCreateRole(Roles.ORGANIZER),
      getOrCreateRole(Roles.SCORER),
      getOrCreateRole(Roles.TEAM_MANAGER),
      getOrCreateRole(Roles.VIEWER)
    ]);

    const salt = Date.now().toString().slice(-6);

    [adminUser, organizer1, organizer2, scorerUser, managerUser1, managerUser2, viewerUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `admin_ops_${salt}@criclive.test`,
          password: "dummyhash",
          firstName: "System",
          lastName: "Administrator",
          roleId: adminRole.id,
          isActive: true
        }
      }),
      prisma.user.create({
        data: {
          email: `org1_ops_${salt}@criclive.test`,
          password: "dummyhash",
          firstName: "Alice",
          lastName: "Organizer",
          roleId: organizerRole.id,
          isActive: true
        }
      }),
      prisma.user.create({
        data: {
          email: `org2_ops_${salt}@criclive.test`,
          password: "dummyhash",
          firstName: "Bob",
          lastName: "Organizer",
          roleId: organizerRole.id,
          isActive: true
        }
      }),
      prisma.user.create({
        data: {
          email: `scorer_ops_${salt}@criclive.test`,
          password: "dummyhash",
          firstName: "Sam",
          lastName: "Scorer",
          roleId: scorerRole.id,
          isActive: true
        }
      }),
      prisma.user.create({
        data: {
          email: `mgr1_ops_${salt}@criclive.test`,
          password: "dummyhash",
          firstName: "Mike",
          lastName: "Manager",
          roleId: teamManagerRole.id,
          isActive: true
        }
      }),
      prisma.user.create({
        data: {
          email: `mgr2_ops_${salt}@criclive.test`,
          password: "dummyhash",
          firstName: "Nancy",
          lastName: "Manager",
          roleId: teamManagerRole.id,
          isActive: true
        }
      }),
      prisma.user.create({
        data: {
          email: `viewer_ops_${salt}@criclive.test`,
          password: "dummyhash",
          firstName: "Victor",
          lastName: "Viewer",
          roleId: viewerRole.id,
          isActive: true
        }
      })
    ]);

    assert.ok(adminUser.id);
    assert.ok(organizer1.id);
    assert.ok(organizer2.id);
    assert.ok(scorerUser.id);
    assert.ok(managerUser1.id);
  });

  it("1. Create tournaments with organizer ownership", async () => {
    const salt = Date.now().toString().slice(-4);

    tournament1 = await createTournamentService(
      {
        name: `Premier Cup ${salt}`,
        description: "Official League Championship",
        format: "LEAGUE",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 15 * 86400000).toISOString()
      },
      { userId: organizer1.id, role: Roles.ORGANIZER }
    );

    tournament2 = await createTournamentService(
      {
        name: `Rival League ${salt}`,
        description: "Secondary League",
        format: "LEAGUE",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 15 * 86400000).toISOString()
      },
      { userId: organizer2.id, role: Roles.ORGANIZER }
    );

    assert.equal(tournament1.organizerId, organizer1.id);
    assert.equal(tournament2.organizerId, organizer2.id);
  });

  it("2. Enforce cross-organizer tournament modification protection (403 Forbidden)", async () => {
    await assert.rejects(
      async () => {
        await updateTournamentService(
          tournament1.id,
          { name: "Hacked Tournament Name" },
          { userId: organizer2.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  it("3. Create teams and populate rosters for readiness validation", async () => {
    const salt = Date.now().toString().slice(-4);

    teamAlpha = await createTeamService({
      name: `Alpha Kings ${salt}`,
      shortName: `AK${salt.slice(-2)}`,
      city: "London"
    });

    teamBeta = await createTeamService({
      name: `Beta Royals ${salt}`,
      shortName: `BR${salt.slice(-2)}`,
      city: "Manchester"
    });

    teamGamma = await createTeamService({
      name: `Gamma Strikers ${salt}`,
      shortName: `GS${salt.slice(-2)}`,
      city: "Birmingham"
    });

    teamDelta = await createTeamService({
      name: `Delta Titans ${salt}`,
      shortName: `DT${salt.slice(-2)}`,
      city: "Leeds"
    });

    // Populate 11 players for Alpha Kings (READY)
    await prisma.player.createMany({
      data: Array.from({ length: 11 }, (_, idx) => ({
        teamId: teamAlpha.id,
        firstName: `AlphaPlayer`,
        lastName: `${idx + 1}`,
        playerType: idx + 1 <= 5 ? "BATSMAN" : idx + 1 <= 7 ? "ALL_ROUNDER" : "BOWLER",
        jerseyNumber: idx + 1
      }))
    });

    // Populate 11 players for Beta Royals (READY)
    await prisma.player.createMany({
      data: Array.from({ length: 11 }, (_, idx) => ({
        teamId: teamBeta.id,
        firstName: `BetaPlayer`,
        lastName: `${idx + 1}`,
        playerType: idx + 1 <= 5 ? "BATSMAN" : idx + 1 <= 7 ? "ALL_ROUNDER" : "BOWLER",
        jerseyNumber: idx + 1
      }))
    });

    // Populate 5 players for Gamma Strikers (INCOMPLETE)
    await prisma.player.createMany({
      data: Array.from({ length: 5 }, (_, idx) => ({
        teamId: teamGamma.id,
        firstName: `GammaPlayer`,
        lastName: `${idx + 1}`,
        playerType: "BATSMAN",
        jerseyNumber: idx + 1
      }))
    });

    // Delta Titans has 0 players (NO_PLAYERS)
    assert.ok(teamAlpha.id);
    assert.ok(teamBeta.id);
    assert.ok(teamGamma.id);
    assert.ok(teamDelta.id);
  });

  it("4. Add teams to tournament with duplicate safety and points table auto-init", async () => {
    // Organizer 1 adds Team Alpha and Team Beta to Tournament 1
    const regA = await registerTeamService(
      { tournamentId: tournament1.id, teamId: teamAlpha.id },
      { userId: organizer1.id, role: Roles.ORGANIZER }
    );
    const regB = await registerTeamService(
      { tournamentId: tournament1.id, teamId: teamBeta.id },
      { userId: organizer1.id, role: Roles.ORGANIZER }
    );
    const regC = await registerTeamService(
      { tournamentId: tournament1.id, teamId: teamGamma.id },
      { userId: organizer1.id, role: Roles.ORGANIZER }
    );

    assert.ok(regA.id);
    assert.ok(regB.id);
    assert.ok(regC.id);

    // Duplicate registration attempt must fail (409 Conflict)
    await assert.rejects(
      async () => {
        await registerTeamService(
          { tournamentId: tournament1.id, teamId: teamAlpha.id },
          { userId: organizer1.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    // Cross-organizer attempt to add team to Tournament 1 must fail (403 Forbidden)
    await assert.rejects(
      async () => {
        await registerTeamService(
          { tournamentId: tournament1.id, teamId: teamDelta.id },
          { userId: organizer2.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  it("5. Evaluate roster readiness accurately (READY, INCOMPLETE, NO PLAYERS)", async () => {
    const teams = await getTournamentTeamsService(tournament1.id);
    assert.equal(teams.length, 3);

    const teamAlphaData = teams.find((t) => t.teamId === teamAlpha.id);
    const teamBetaData = teams.find((t) => t.teamId === teamBeta.id);
    const teamGammaData = teams.find((t) => t.teamId === teamGamma.id);

    assert.equal(teamAlphaData.rosterStatus, "READY");
    assert.equal(teamAlphaData.isReady, true);
    assert.equal(teamAlphaData.playerCount, 11);

    assert.equal(teamBetaData.rosterStatus, "READY");
    assert.equal(teamBetaData.isReady, true);
    assert.equal(teamBetaData.playerCount, 11);

    assert.equal(teamGammaData.rosterStatus, "INCOMPLETE");
    assert.equal(teamGammaData.isReady, false);
    assert.equal(teamGammaData.playerCount, 5);
  });

  it("6. Assign, change, and remove team managers with validation and audit logs", async () => {
    // Organizer 1 assigns managerUser1 to teamAlpha
    const updatedTeam = await updateTeamService(
      teamAlpha.id,
      { managerId: managerUser1.id },
      { userId: organizer1.id, role: Roles.ORGANIZER }
    );
    assert.equal(updatedTeam.managerId, managerUser1.id);

    // Organizer 1 assigns managerUser2 to teamBeta
    const updatedBeta = await updateTeamService(
      teamBeta.id,
      { managerId: managerUser2.id },
      { userId: organizer1.id, role: Roles.ORGANIZER }
    );
    assert.equal(updatedBeta.managerId, managerUser2.id);

    // Verify audit log
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityId: teamAlpha.id,
        action: "TEAM_MANAGER_ASSIGNED"
      }
    });
    assert.ok(auditLog);

    // Cross-organizer attempt to modify teamAlpha must fail (403 Forbidden)
    await assert.rejects(
      async () => {
        await updateTeamService(
          teamAlpha.id,
          { managerId: managerUser2.id },
          { userId: organizer2.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // Non-TEAM_MANAGER role assignment attempt must fail
    await assert.rejects(
      async () => {
        await updateTeamService(
          teamAlpha.id,
          { managerId: viewerUser.id },
          { userId: organizer1.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it("7. Generate tournament fixtures with ownership check and duplicate prevention", async () => {
    // Cross-organizer attempt to generate fixtures for Tournament 1 must fail (403 Forbidden)
    await assert.rejects(
      async () => {
        await generateFixturesService(
          tournament1.id,
          { venue: "Lord's Cricket Ground" },
          { userId: organizer2.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // Organizer 1 generates round-robin fixtures for Tournament 1 (3 teams = 3 matches)
    const fixtures = await generateFixturesService(
      tournament1.id,
      { venue: "Lord's Cricket Ground" },
      { userId: organizer1.id, role: Roles.ORGANIZER }
    );

    assert.equal(fixtures.length, 3);
    assert.equal(fixtures[0].tournament, tournament1.name);

    // Duplicate fixture generation without regenerate flag must fail
    await assert.rejects(
      async () => {
        await generateFixturesService(
          tournament1.id,
          { venue: "The Oval" },
          { userId: organizer1.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it("8. Strict fixture isolation by tournament", async () => {
    const tournament1Matches = await getAllMatchesService({ tournamentId: tournament1.id });
    assert.equal(tournament1Matches.matches.length, 3);

    for (const match of tournament1Matches.matches) {
      assert.equal(match.tournament.id, tournament1.id);
    }
  });

  it("9. Assign and update match scorer with validation and audit logs", async () => {
    const matchesRes = await getAllMatchesService({ tournamentId: tournament1.id });
    const firstMatch = matchesRes.matches[0];

    // Cross-organizer attempt to assign scorer must fail (403 Forbidden)
    await assert.rejects(
      async () => {
        await updateMatchService(
          firstMatch.id,
          { scorerId: scorerUser.id },
          { userId: organizer2.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // Non-SCORER user assignment attempt must fail
    await assert.rejects(
      async () => {
        await updateMatchService(
          firstMatch.id,
          { scorerId: viewerUser.id },
          { userId: organizer1.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );

    // Organizer 1 assigns scorerUser to firstMatch
    const updated = await updateMatchService(
      firstMatch.id,
      { scorerId: scorerUser.id },
      { userId: organizer1.id, role: Roles.ORGANIZER }
    );
    assert.equal(updated.scorer.id, scorerUser.id);

    // Verify audit log
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityId: firstMatch.id,
        action: "MATCH_SCORER_ASSIGNED"
      }
    });
    assert.ok(auditLog);
  });

  it("10. Fetch Tournament Dashboard Bundle", async () => {
    const dashboard = await getTournamentDashboardService(tournament1.id, {
      userId: organizer1.id,
      role: Roles.ORGANIZER
    });

    assert.equal(dashboard.tournament.id, tournament1.id);
    assert.equal(dashboard.registeredTeams.length, 3);
    assert.equal(dashboard.matches.length, 3);
    assert.equal(dashboard.staff.organizer.id, organizer1.id);
    assert.ok(dashboard.eligibleScorers.length > 0);
    assert.ok(dashboard.eligibleManagers.length > 0);
    assert.ok(dashboard.availableTeams.some((t) => t.id === teamDelta.id));
  });

  it("10a. Team Manager submits Playing XI for their own team (with cross-team protection)", async () => {
    const match = await prisma.match.findFirst({
      where: {
        tournamentId: tournament1.id,
        teamAId: teamAlpha.id,
        teamBId: teamBeta.id
      }
    });
    assert.ok(match);

    const alphaPlayers = await prisma.player.findMany({ where: { teamId: teamAlpha.id }, orderBy: { jerseyNumber: "asc" } });

    // Team Manager 2 attempts to submit Playing XI for Team Alpha (must fail with 403)
    await assert.rejects(
      async () => {
        await createPlayingXIService(
          match.id,
          teamAlpha.id,
          alphaPlayers.slice(0, 11).map((p, idx) => ({
            playerId: p.id,
            battingOrder: idx + 1,
            isCaptain: idx === 0,
            isWicketKeeper: idx === 1
          })),
          { userId: managerUser2.id, role: Roles.TEAM_MANAGER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // Team Manager 1 (manager of Alpha) submits Playing XI for Team Alpha (succeeds)
    const result = await createPlayingXIService(
      match.id,
      teamAlpha.id,
      alphaPlayers.slice(0, 11).map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx === 0,
        isWicketKeeper: idx === 1
      })),
      { userId: managerUser1.id, role: Roles.TEAM_MANAGER }
    );
    assert.ok(result.message);

    const xiCount = await prisma.playingXI.count({ where: { matchId: match.id, teamId: teamAlpha.id } });
    assert.equal(xiCount, 11);
  });

  it("10b. Generate, copy, revoke, and regenerate match-specific scoring access link", async () => {
    const match = await prisma.match.findFirst({
      where: {
        tournamentId: tournament1.id,
        teamAId: teamAlpha.id,
        teamBId: teamBeta.id
      }
    });

    // Cross-organizer generation attempt must fail (403)
    await assert.rejects(
      async () => {
        await generateScoringTokenService(match.id, { userId: organizer2.id, role: Roles.ORGANIZER });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // Organizer 1 generates scoring token
    const tokenResult = await generateScoringTokenService(match.id, { userId: organizer1.id, role: Roles.ORGANIZER });
    assert.ok(tokenResult.scoringToken.startsWith("sc_"));
    assert.ok(tokenResult.scoringTokenGeneratedAt);

    // Get active scoring token
    const fetchedToken = await getScoringTokenService(match.id, { userId: organizer1.id, role: Roles.ORGANIZER });
    assert.equal(fetchedToken.scoringToken, tokenResult.scoringToken);

    // Fetch guest scoring session by token
    const session = await getMatchByScoringTokenService(tokenResult.scoringToken);
    assert.equal(session.match.id, match.id);
    assert.equal(session.match.teamA.id, teamAlpha.id);
    assert.equal(session.playingXI.teamACount, 11);
    assert.equal(session.playingXI.teamBCount, 0);
    assert.equal(session.playingXI.isReady, false);

    // Revoke token
    const revokeResult = await revokeScoringTokenService(match.id, { userId: organizer1.id, role: Roles.ORGANIZER });
    assert.equal(revokeResult.scoringToken, null);

    // Attempting to fetch session with revoked token must fail (404)
    await assert.rejects(
      async () => {
        await getMatchByScoringTokenService(tokenResult.scoringToken);
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );

    // Regenerate token -> fresh token assigned
    const regenResult = await generateScoringTokenService(match.id, { userId: organizer1.id, role: Roles.ORGANIZER });
    assert.ok(regenResult.scoringToken.startsWith("sc_"));
    assert.notEqual(regenResult.scoringToken, tokenResult.scoringToken);

    const activeSession = await getMatchByScoringTokenService(regenResult.scoringToken);
    assert.equal(activeSession.match.id, match.id);
  });

  it("11. Setup match Playing XI, Toss, and Start Match with authorization", async () => {
    // Find the match between teamAlpha and teamBeta
    const match = await prisma.match.findFirst({
      where: {
        tournamentId: tournament1.id,
        teamAId: teamAlpha.id,
        teamBId: teamBeta.id
      }
    });
    assert.ok(match);

    // Set Toss
    await updateMatchService(
      match.id,
      {
        tossWinnerId: teamAlpha.id,
        tossDecision: "BAT",
        scorerId: scorerUser.id
      },
      { userId: organizer1.id, role: Roles.ORGANIZER }
    );

    const alphaPlayers = await prisma.player.findMany({ where: { teamId: teamAlpha.id }, orderBy: { jerseyNumber: "asc" } });
    const betaPlayers = await prisma.player.findMany({ where: { teamId: teamBeta.id }, orderBy: { jerseyNumber: "asc" } });

    // Team Beta Manager submits Playing XI for Team Beta (11 players)
    await createPlayingXIService(
      match.id,
      teamBeta.id,
      betaPlayers.slice(0, 11).map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx === 0,
        isWicketKeeper: idx === 1
      })),
      { userId: managerUser2.id, role: Roles.TEAM_MANAGER }
    );

    // Verify readiness for both teams
    const totalXI = await prisma.playingXI.count({ where: { matchId: match.id } });
    assert.equal(totalXI, 22);

    // Start match as assigned SCORER
    const startedMatch = await startMatch(
      match.id,
      alphaPlayers[0].id,
      alphaPlayers[1].id,
      betaPlayers[0].id,
      { userId: scorerUser.id, role: Roles.SCORER }
    );

    assert.equal(startedMatch.status, "LIVE");

    // Rescheduling a LIVE match must fail
    await assert.rejects(
      async () => {
        await updateMatchService(
          match.id,
          { matchDate: new Date(Date.now() + 86400000).toISOString() },
          { userId: organizer1.id, role: Roles.ORGANIZER }
        );
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it("12. Complete match and verify automatic points table standings update", async () => {
    const match = await prisma.match.findFirst({
      where: {
        tournamentId: tournament1.id,
        teamAId: teamAlpha.id,
        teamBId: teamBeta.id
      },
      include: { innings: true }
    });

    const innings1 = match.innings[0];

    // Complete innings 1
    await prisma.innings.update({
      where: { id: innings1.id },
      data: {
        totalRuns: 160,
        wickets: 4,
        legalBalls: 120,
        overs: 20,
        status: "COMPLETED"
      }
    });

    // Create and complete innings 2
    const secondInnings = await prisma.innings.create({
      data: {
        matchId: match.id,
        inningsNumber: 2,
        battingTeamId: teamBeta.id,
        bowlingTeamId: teamAlpha.id,
        totalRuns: 140,
        wickets: 8,
        legalBalls: 120,
        overs: 20,
        status: "LIVE"
      }
    });

    // Finalize match result: Team Alpha won by 20 runs
    const evalResult = await evaluateMatchResult(secondInnings.id);
    assert.equal(evalResult.completed, true);
    assert.equal(evalResult.winnerTeamId, teamAlpha.id);

    const completedMatch = await prisma.match.findUnique({ where: { id: match.id } });
    assert.equal(completedMatch.status, "COMPLETED");
    assert.equal(completedMatch.winnerTeamId, teamAlpha.id);

    // Verify Points Table
    const standings = await getPointsTableService(tournament1.id);
    assert.ok(standings.length >= 2);

    const winnerRow = standings.find((s) => s.teamId === teamAlpha.id);
    const loserRow = standings.find((s) => s.teamId === teamBeta.id);

    assert.equal(winnerRow.played, 1);
    assert.equal(winnerRow.won, 1);
    assert.equal(winnerRow.points, 2);
    assert.ok(winnerRow.netRunRate > 0);

    assert.equal(loserRow.played, 1);
    assert.equal(loserRow.lost, 1);
    assert.equal(loserRow.points, 0);
    assert.ok(loserRow.netRunRate < 0);
  });

  it("13. Clean up test data", async () => {
    const tournamentIds = [tournament1?.id, tournament2?.id].filter(Boolean);
    if (tournamentIds.length > 0) {
      const matches = await prisma.match.findMany({
        where: { tournamentId: { in: tournamentIds } }
      });
      for (const m of matches) {
        await prisma.ball.deleteMany({ where: { innings: { matchId: m.id } } });
        await prisma.battingScorecard.deleteMany({ where: { innings: { matchId: m.id } } });
        await prisma.bowlingScorecard.deleteMany({ where: { innings: { matchId: m.id } } });
        await prisma.partnership.deleteMany({ where: { innings: { matchId: m.id } } });
        await prisma.notification.deleteMany({ where: { matchId: m.id } });
        await prisma.playingXI.deleteMany({ where: { matchId: m.id } });
        await prisma.innings.deleteMany({ where: { matchId: m.id } });
        await prisma.match.delete({ where: { id: m.id } });
      }

      await prisma.pointsTable.deleteMany({
        where: { tournamentId: { in: tournamentIds } }
      });
      await prisma.tournamentTeam.deleteMany({
        where: { tournamentId: { in: tournamentIds } }
      });
      await prisma.tournament.deleteMany({
        where: { id: { in: tournamentIds } }
      });
    }

    const testTeamIds = [teamAlpha?.id, teamBeta?.id, teamGamma?.id, teamDelta?.id].filter(Boolean);
    if (testTeamIds.length > 0) {
      await prisma.player.deleteMany({ where: { teamId: { in: testTeamIds } } });
      await prisma.team.deleteMany({ where: { id: { in: testTeamIds } } });
    }

    const userIds = [
      adminUser?.id,
      organizer1?.id,
      organizer2?.id,
      scorerUser?.id,
      managerUser1?.id,
      managerUser2?.id,
      viewerUser?.id
    ].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });
});
