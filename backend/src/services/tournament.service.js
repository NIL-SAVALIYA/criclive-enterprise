import prisma from "../config/db.js";
import {
  createTournament,
  getAllTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  findTournamentByName
} from "../repositories/tournament.repository.js";

const ALLOWED_TRANSITIONS = {
  UPCOMING: ["LIVE", "CANCELLED"],
  LIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

/**
 * Creates a new tournament with case-insensitive name validation.
 */
export async function createTournamentService(tournamentData) {
  const name = tournamentData.name.trim();

  const existingTournament = await findTournamentByName(name);
  if (existingTournament) {
    const error = new Error("Tournament name already exists.");
    error.statusCode = 409;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const tournament = await createTournament(
      {
        ...tournamentData,
        name
      },
      tx
    );

    console.log(`[TOURNAMENT EVENT] Tournament Created | ID: ${tournament.id} | Name: "${tournament.name}"`);
    return tournament;
  });
}

/**
 * Gets all tournaments with pagination and filters.
 */
export async function getAllTournamentsService(params = {}) {
  const result = await getAllTournaments(params);
  // Maintain backward compatibility: if no pagination params were passed, or for array expectations, return result.tournaments or result object
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
 * Updates a tournament with status transition guards and name check.
 */
export async function updateTournamentService(id, tournamentData) {
  const tournament = await getTournamentById(id);
  if (!tournament) {
    const error = new Error("Tournament not found.");
    error.statusCode = 404;
    throw error;
  }

  // Name duplicate check if name is being changed
  if (tournamentData.name && tournamentData.name.trim().toLowerCase() !== tournament.name.toLowerCase()) {
    const existingName = await findTournamentByName(tournamentData.name.trim());
    if (existingName) {
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

  return prisma.$transaction(async (tx) => {
    const updated = await updateTournament(id, tournamentData, tx);
    console.log(`[TOURNAMENT EVENT] Tournament Updated | ID: ${updated.id} | Status: ${updated.status}`);
    return updated;
  });
}

/**
 * Deletes a tournament with delete-protection guards.
 */
export async function deleteTournamentService(id) {
  const tournament = await getTournamentById(id);
  if (!tournament) {
    const error = new Error("Tournament not found.");
    error.statusCode = 404;
    throw error;
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

  return prisma.$transaction(async (tx) => {
    const result = await deleteTournament(id, tx);
    console.log(`[TOURNAMENT EVENT] Tournament Deleted | ID: ${id} | Name: "${tournament.name}"`);
    return result;
  });
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