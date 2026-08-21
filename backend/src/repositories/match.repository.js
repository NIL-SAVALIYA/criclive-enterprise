import prisma from "../config/db.js";

/**
 * Creates a new match record.
 */
export async function createMatch(data, db = prisma) {
  return db.match.create({
    data,
    include: {
      teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      tossWinner: { select: { id: true, name: true, shortName: true } }
    }
  });
}

/**
 * Retrieves matches with search, filtering, and pagination.
 */
export async function getAllMatches(params = {}, db = prisma) {
  const { page, limit, search, tournamentId, status, sport } = params;

  const where = {};

  if (search) {
    where.OR = [
      { venue: { contains: search, mode: "insensitive" } },
      { teamA: { name: { contains: search, mode: "insensitive" } } },
      { teamB: { name: { contains: search, mode: "insensitive" } } }
    ];
  }

  if (tournamentId) {
    where.tournamentId = tournamentId;
  }

  if (status) {
    where.status = status;
  }

  if (sport) {
    where.tournament = {
      sport: {
        code: sport.trim().toUpperCase()
      }
    };
  }

  const query = {
    where,
    orderBy: {
      matchDate: "asc"
    },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          format: true,
          organizerId: true,
          sport: { select: { id: true, code: true, name: true } }
        }
      },
      teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      tossWinner: { select: { id: true, name: true, shortName: true } },
      winnerTeam: { select: { id: true, name: true, shortName: true } },
      scorer: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: {
        select: {
          innings: true,
          playingXI: true
        }
      }
    }
  };

  const isPaginated = Boolean(page && limit);
  if (isPaginated) {
    query.skip = (page - 1) * limit;
    query.take = Number(limit);
  }

  const [matches, total] = await Promise.all([
    db.match.findMany(query),
    db.match.count({ where })
  ]);

  return {
    matches,
    pagination: {
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
      totalPages: isPaginated ? Math.ceil(total / limit) : 1
    }
  };
}

/**
 * Retrieves a match by ID with complete team, innings, and toss relations.
 */
export async function getMatchById(id, db = prisma) {
  return db.match.findUnique({
    where: { id },
    include: {
      tournament: {
        select: {
          id: true,
          name: true,
          format: true,
          status: true,
          organizerId: true,
          sport: { select: { id: true, code: true, name: true } }
        }
      },
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
        select: {
          playingXI: true,
          innings: true
        }
      }
    }
  });
}

/**
 * Updates a match record by ID.
 */
export async function updateMatch(id, data, db = prisma) {
  return db.match.update({
    where: { id },
    data,
    include: {
      teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      tossWinner: { select: { id: true, name: true, shortName: true } },
      scorer: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });
}

/**
 * Deletes a match record by ID.
 */
export async function deleteMatch(id, db = prisma) {
  return db.match.delete({
    where: { id }
  });
}

/**
 * Gets currently active LIVE matches.
 */
export async function getLiveMatches(db = prisma) {
  return db.match.findMany({
    where: { status: "LIVE" },
    include: {
      tournament: { select: { id: true, name: true, format: true, organizerId: true } },
      teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      tossWinner: { select: { id: true, name: true, shortName: true } },
      scorer: { select: { id: true, firstName: true, lastName: true, email: true } }
    },
    orderBy: { matchDate: "asc" }
  });
}

/**
 * Gets UPCOMING matches.
 */
export async function getUpcomingMatches(db = prisma) {
  return db.match.findMany({
    where: { status: "UPCOMING" },
    include: {
      tournament: { select: { id: true, name: true, format: true, organizerId: true } },
      teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      tossWinner: { select: { id: true, name: true, shortName: true } },
      scorer: { select: { id: true, firstName: true, lastName: true, email: true } }
    },
    orderBy: { matchDate: "asc" }
  });
}

/**
 * Gets COMPLETED matches.
 */
export async function getCompletedMatches(db = prisma) {
  return db.match.findMany({
    where: { status: "COMPLETED" },
    include: {
      tournament: { select: { id: true, name: true, format: true, organizerId: true } },
      teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      tossWinner: { select: { id: true, name: true, shortName: true } },
      winnerTeam: { select: { id: true, name: true, shortName: true } },
      scorer: { select: { id: true, firstName: true, lastName: true, email: true } }
    },
    orderBy: { completedAt: "desc" }
  });
}

/**
 * Gets all matches belonging to a specific tournament.
 */
export async function getMatchesByTournament(tournamentId, db = prisma) {
  return db.match.findMany({
    where: { tournamentId },
    include: {
      tournament: { select: { id: true, name: true, format: true, organizerId: true } },
      teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      tossWinner: { select: { id: true, name: true, shortName: true } },
      winnerTeam: { select: { id: true, name: true, shortName: true } },
      scorer: { select: { id: true, firstName: true, lastName: true, email: true } }
    },
    orderBy: { matchDate: "asc" }
  });
}

/**
 * Counts total matches in a tournament.
 */
export async function countMatchesByTournament(tournamentId, db = prisma) {
  return db.match.count({ where: { tournamentId } });
}

/**
 * Bulk creates multiple match fixtures.
 */
export async function createManyMatches(data, db = prisma) {
  return db.match.createMany({ data });
}