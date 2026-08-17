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

/*
|--------------------------------------------------------------------------
| ARCHITECTURAL EXTENSION HOOKS (FUTURE READY - TASK 13)
|--------------------------------------------------------------------------
| - generateKnockoutTree(tournamentId): Future implementation for bracket generation
| - generateRoundRobinSchedule(tournamentId): Future implementation for automated fixtures
| - createMultiSeasonSeries(parentTournamentId): Future implementation for multi-tier leagues
|--------------------------------------------------------------------------
*/