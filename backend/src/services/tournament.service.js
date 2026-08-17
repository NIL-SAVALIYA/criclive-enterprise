import prisma from "../config/db.js";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  findTournamentByName
} from "../repositories/tournament.repository.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { Roles } from "../constants/roles.js";

const ALLOWED_TRANSITIONS = {
  UPCOMING: ["LIVE", "CANCELLED"],
  LIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

/**
 * Creates a new tournament with case-insensitive name validation and organizer association.
 */
export async function createTournamentService(tournamentData, user = null) {
  const name = tournamentData.name.trim();

  const existingTournament = await findTournamentByName(name);
  if (existingTournament) {
    const error = new Error("Tournament name already exists.");
    error.statusCode = 409;
    throw error;
  }

  // Always derive organizerId from the authenticated user. Never trust req.body.organizerId.
  const organizerId = user ? user.userId : (tournamentData.organizerId || null);

  return prisma.$transaction(
    async (tx) => {
      const tournament = await createTournament(
        {
          ...tournamentData,
          name,
          organizerId
        },
        tx
      );

      // Audit log
      await recordAuditLog({
        userId: user ? user.userId : null,
        action: "TOURNAMENT_CREATED",
        entityType: "TOURNAMENT",
        entityId: tournament.id,
        metadata: { name: tournament.name, format: tournament.format, organizerId },
        db: tx
      });

      console.log(`[TOURNAMENT EVENT] Tournament Created | ID: ${tournament.id} | Name: "${tournament.name}"`);
      return tournament;
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Gets all tournaments with pagination and filters.
 */
export async function getAllTournamentsService(params = {}) {
  const result = await getAllTournaments(params);
  return result;
}

/**
 * Gets a tournament by ID.
 */
export async function getTournamentByIdService(id) {
  const tournament = await getTournamentById(id);
  if (!tournament) {
    const error = new Error("Tournament not found.");
    error.statusCode = 404;
    throw error;
  }
  return tournament;
}

/**
 * Updates a tournament with ownership verification, status transition guards and name check.
 */
export async function updateTournamentService(id, tournamentData, user = null) {
  const tournament = await getTournamentById(id);
  if (!tournament) {
    const error = new Error("Tournament not found.");
    error.statusCode = 404;
    throw error;
  }

  // Ownership verification for ORGANIZER role
  if (user && user.role === Roles.ORGANIZER) {
    if (tournament.organizerId && tournament.organizerId !== user.userId) {
      const error = new Error("Access denied. You can only modify tournaments created by your account.");
      error.statusCode = 403;
      throw error;
    }
  }

  // Name duplicate check if name is being changed
  if (tournamentData.name && tournamentData.name.trim().toLowerCase() !== tournament.name.toLowerCase()) {
    const existingName = await findTournamentByName(tournamentData.name.trim());
    if (existingName && existingName.id !== id) {
      const error = new Error("Tournament name already exists.");
      error.statusCode = 409;
      throw error;
    }
  }

  // Status transition validation
  if (tournamentData.status && tournamentData.status !== tournament.status) {
    const allowed = ALLOWED_TRANSITIONS[tournament.status] || [];
    if (!allowed.includes(tournamentData.status)) {
      const error = new Error(`Cannot transition tournament status from '${tournament.status}' to '${tournamentData.status}'.`);
      error.statusCode = 400;
      throw error;
    }
  }

  return prisma.$transaction(
    async (tx) => {
      const updated = await updateTournament(id, tournamentData, tx);

      await recordAuditLog({
        userId: user ? user.userId : null,
        action: "TOURNAMENT_UPDATED",
        entityType: "TOURNAMENT",
        entityId: updated.id,
        metadata: { status: updated.status, changes: tournamentData },
        db: tx
      });

      console.log(`[TOURNAMENT EVENT] Tournament Updated | ID: ${updated.id} | Status: ${updated.status}`);
      return updated;
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Deletes a tournament with ownership verification and delete-protection guards.
 */
export async function deleteTournamentService(id, user = null) {
  const tournament = await getTournamentById(id);
  if (!tournament) {
    const error = new Error("Tournament not found.");
    error.statusCode = 404;
    throw error;
  }

  // Ownership verification for ORGANIZER role
  if (user && user.role === Roles.ORGANIZER) {
    if (tournament.organizerId && tournament.organizerId !== user.userId) {
      const error = new Error("Access denied. You can only delete tournaments created by your account.");
      error.statusCode = 403;
      throw error;
    }
  }

  if (tournament.status === "LIVE" || tournament.status === "COMPLETED") {
    const error = new Error(`Active or completed tournaments cannot be deleted. Current status: ${tournament.status}`);
    error.statusCode = 400;
    throw error;
  }

  const teamCount = tournament._count?.registeredTeams || 0;
  const matchCount = tournament._count?.matches || 0;

  if (teamCount > 0 || matchCount > 0) {
    const error = new Error(`Cannot delete tournament with registered teams (${teamCount}) or scheduled matches (${matchCount}).`);
    error.statusCode = 409;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const result = await deleteTournament(id, tx);

      await recordAuditLog({
        userId: user ? user.userId : null,
        action: "TOURNAMENT_DELETED",
        entityType: "TOURNAMENT",
        entityId: id,
        metadata: { name: tournament.name },
        db: tx
      });

      console.log(`[TOURNAMENT EVENT] Tournament Deleted | ID: ${id} | Name: "${tournament.name}"`);
      return result;
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Retrieves comprehensive operational dashboard data for a tournament.
 */
export async function getTournamentDashboardService(id, user = null) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      organizer: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true }
      },
      registeredTeams: {
        include: {
          team: {
            include: {
              players: {
                select: { id: true, firstName: true, lastName: true, playerType: true, jerseyNumber: true }
              },
              manager: {
                select: { id: true, firstName: true, lastName: true, email: true, phone: true }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      },
      matches: {
        include: {
          teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          tossWinner: { select: { id: true, name: true, shortName: true } },
          winnerTeam: { select: { id: true, name: true, shortName: true } },
          scorer: { select: { id: true, firstName: true, lastName: true, email: true } },
          innings: {
            select: {
              id: true,
              inningsNumber: true,
              totalRuns: true,
              wickets: true,
              overs: true,
              status: true,
              battingTeamId: true,
              bowlingTeamId: true
            },
            orderBy: { inningsNumber: "asc" }
          },
          _count: {
            select: { playingXI: true, innings: true }
          }
        },
        orderBy: { matchDate: "asc" }
      },
      pointsTable: {
        include: {
          team: { select: { id: true, name: true, shortName: true, logoUrl: true } }
        },
        orderBy: [{ points: "desc" }, { netRunRate: "desc" }]
      }
    }
  });

  if (!tournament) {
    const error = new Error("Tournament not found.");
    error.statusCode = 404;
    throw error;
  }

  // Ownership verification for ORGANIZER role
  if (user && user.role === Roles.ORGANIZER) {
    if (tournament.organizerId && tournament.organizerId !== user.userId) {
      const error = new Error("Access denied. You can only manage tournaments created by your account.");
      error.statusCode = 403;
      throw error;
    }
  }

  // 1. Registered teams with readiness status
  const registeredTeamIds = new Set(tournament.registeredTeams.map((rt) => rt.teamId));
  const registeredTeams = tournament.registeredTeams.map((rt) => {
    const team = rt.team;
    const playerCount = team.players?.length || 0;
    let rosterStatus = "NO_PLAYERS";
    if (playerCount >= 11) {
      rosterStatus = "READY";
    } else if (playerCount > 0) {
      rosterStatus = "INCOMPLETE";
    }

    return {
      registrationId: rt.id,
      teamId: team.id,
      name: team.name,
      shortName: team.shortName,
      logoUrl: team.logoUrl,
      city: team.city,
      description: team.description,
      playerCount,
      rosterStatus,
      isReady: playerCount >= 11,
      managerId: team.managerId,
      manager: team.manager,
      players: team.players
    };
  });

  // 2. Fetch all available teams (teams not yet in this tournament)
  const allTeams = await prisma.team.findMany({
    where: {
      id: { notIn: Array.from(registeredTeamIds) }
    },
    include: {
      _count: { select: { players: true } },
      manager: { select: { id: true, firstName: true, lastName: true, email: true } }
    },
    orderBy: { name: "asc" }
  });

  const availableTeams = allTeams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    city: t.city,
    logoUrl: t.logoUrl,
    playerCount: t._count.players,
    manager: t.manager
  }));

  // 3. Eligible Scorers (users with role SCORER or ADMIN)
  const eligibleScorers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { name: { in: [Roles.SCORER, Roles.ADMIN] } }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: { select: { name: true } }
    },
    orderBy: { firstName: "asc" }
  });

  // 4. Eligible Team Managers (users with role TEAM_MANAGER or ADMIN)
  const eligibleManagers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { name: { in: [Roles.TEAM_MANAGER, Roles.ADMIN] } }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: { select: { name: true } }
    },
    orderBy: { firstName: "asc" }
  });

  // 5. Matches grouped by status
  const upcomingMatches = tournament.matches.filter((m) => m.status === "UPCOMING");
  const liveMatches = tournament.matches.filter((m) => m.status === "LIVE");
  const completedMatches = tournament.matches.filter((m) => m.status === "COMPLETED");

  // 6. Staff summary
  const staff = {
    organizer: tournament.organizer
      ? {
          id: tournament.organizer.id,
          name: `${tournament.organizer.firstName} ${tournament.organizer.lastName}`,
          email: tournament.organizer.email
        }
      : null,
    teamManagers: registeredTeams.map((t) => ({
      teamId: t.teamId,
      teamName: t.name,
      managerId: t.managerId,
      managerName: t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : "Not Assigned",
      email: t.manager?.email || null
    })),
    matchScorers: tournament.matches.map((m) => ({
      matchId: m.id,
      matchTitle: `${m.teamA.shortName || m.teamA.name} vs ${m.teamB.shortName || m.teamB.name}`,
      status: m.status,
      scorerId: m.scorerId,
      scorerName: m.scorer ? `${m.scorer.firstName} ${m.scorer.lastName}` : "Not Assigned",
      email: m.scorer?.email || null,
      isAssigned: Boolean(m.scorerId)
    }))
  };

  // 7. Operational warnings
  const warnings = [];
  if (registeredTeams.length === 0) {
    warnings.push("No teams have been added to this tournament.");
  } else if (registeredTeams.length < 2) {
    warnings.push("At least 2 teams are required to generate fixtures.");
  }

  const incompleteTeams = registeredTeams.filter((t) => !t.isReady);
  if (incompleteTeams.length > 0) {
    warnings.push(
      `Some teams do not have 11 players: ${incompleteTeams.map((t) => `${t.name} (${t.playerCount} players)`).join(", ")}.`
    );
  }

  const unassignedScorerMatches = upcomingMatches.filter((m) => !m.scorerId);
  if (unassignedScorerMatches.length > 0) {
    warnings.push(`${unassignedScorerMatches.length} upcoming match(es) have no assigned scorer.`);
  }

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      format: tournament.format,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      status: tournament.status,
      organizerId: tournament.organizerId,
      organizer: tournament.organizer
    },
    registeredTeams,
    availableTeams,
    matches: tournament.matches,
    groupedMatches: {
      upcoming: upcomingMatches,
      live: liveMatches,
      completed: completedMatches
    },
    staff,
    standings: tournament.pointsTable,
    eligibleScorers,
    eligibleManagers,
    warnings,
    summary: {
      totalTeams: registeredTeams.length,
      readyTeams: registeredTeams.filter((t) => t.isReady).length,
      totalMatches: tournament.matches.length,
      upcomingMatches: upcomingMatches.length,
      liveMatches: liveMatches.length,
      completedMatches: completedMatches.length,
      isReadyForFixtures: registeredTeams.length >= 2 && tournament.matches.length === 0
    }
  };
}

/*
|--------------------------------------------------------------------------
| ARCHITECTURAL EXTENSION HOOKS (FUTURE READY - TASK 13)
|--------------------------------------------------------------------------
| - generateKnockoutTree(tournamentId): Future implementation for bracket generation
| - generateRoundRobinSchedule(tournamentId): Future implementation for automated fixtures
| - createMultiSeasonSeries(parentTournamentId): Future implementation for multi-tier leagues
|--------------------------------------------------------------------------
*/