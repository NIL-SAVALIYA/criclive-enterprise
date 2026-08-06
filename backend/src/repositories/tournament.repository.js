import prisma from "../config/db.js";

/**
 * Creates a new tournament record.
 */
export async function createTournament(data, db = prisma) {
  return db.tournament.create({
    data
  });
}

/**
 * Retrieves tournaments with search, filtering, and pagination.
 */
export async function getAllTournaments(params = {}, db = prisma) {
  const { page = 1, limit = 10, search, status, format } = params;
  const skip = (page - 1) * limit;

  const where = {};

  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive"
    };
  }

  if (status) {
    where.status = status;
  }

  if (format) {
    where.format = format;
  }

  const [tournaments, total] = await Promise.all([
    db.tournament.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        startDate: "desc"
      },
      include: {
        _count: {
          select: {
            registeredTeams: true,
            matches: true
          }
        }
      }
    }),
    db.tournament.count({ where })
  ]);

  return {
    tournaments,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Retrieves a tournament by ID with relation summary counts.
 */
export async function getTournamentById(id, db = prisma) {
  return db.tournament.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          registeredTeams: true,
          matches: true
        }
      },
      registeredTeams: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
              logoUrl: true
            }
          }
        }
      },
      matches: {
        select: {
          id: true,
          matchDate: true,
          status: true,
          venue: true,
          result: true,
          teamA: { select: { id: true, name: true, shortName: true } },
          teamB: { select: { id: true, name: true, shortName: true } }
        },
        orderBy: {
          matchDate: "asc"
        }
      }
    }
  });
}

/**
 * Updates a tournament record by ID.
 */
export async function updateTournament(id, data, db = prisma) {
  return db.tournament.update({
    where: { id },
    data
  });
}

/**
 * Deletes a tournament record by ID.
 */
export async function deleteTournament(id, db = prisma) {
  return db.tournament.delete({
    where: { id }
  });
}

/**
 * Finds a tournament by name (case-insensitive).
 */
export async function findTournamentByName(name, db = prisma) {
  if (!name) return null;
  return db.tournament.findFirst({
    where: {
      name: {
        equals: name.trim(),
        mode: "insensitive"
      }
    }
  });
}