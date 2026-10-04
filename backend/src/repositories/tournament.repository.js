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
  const { page, limit, search, status, format, sport } = params;

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

  if (sport) {
    where.sport = {
      code: sport.trim().toUpperCase()
    };
  }

  const query = {
    where,
    orderBy: {
      startDate: "desc"
    },
    include: {
      sport: {
        select: {
          id: true,
          code: true,
          name: true,
          icon: true
        }
      },
      _count: {
        select: {
          registeredTeams: true,
          matches: true
        }
      }
    }
  };

  const isPaginated = Boolean(page && limit);
  if (isPaginated) {
    query.skip = (page - 1) * limit;
    query.take = Number(limit);
  }

  const [tournaments, total] = await Promise.all([
    db.tournament.findMany(query),
    db.tournament.count({ where })
  ]);

  return {
    tournaments,
    pagination: {
      total,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : total,
      totalPages: isPaginated ? Math.ceil(total / limit) : 1
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
      sport: {
        select: {
          id: true,
          code: true,
          name: true,
          icon: true
        }
      },
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