import prisma from "../config/db.js";

/**
 * Creates a new team record.
 */
export async function createTeam(data, db = prisma) {
  return db.team.create({
    data,
    include: {
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
}

/**
 * Retrieves all teams with search, filtering, pagination, and count summaries.
 */
export async function getAllTeams(params = {}, db = prisma) {
  const { page = 1, limit = 10, search, city } = params;
  const skip = (page - 1) * limit;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { shortName: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } }
    ];
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  const [teams, total] = await Promise.all([
    db.team.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        name: "asc"
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            players: true,
            tournaments: true,
            matchesAsTeamA: true,
            matchesAsTeamB: true
          }
        }
      }
    }),
    db.team.count({ where })
  ]);

  return {
    teams,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Retrieves a team by ID with manager, players roster, and count metadata.
 */
export async function getTeamById(id, db = prisma) {
  return db.team.findUnique({
    where: { id },
    include: {
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      },
      players: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jerseyNumber: true,
          playerType: true,
          battingStyle: true,
          bowlingStyle: true,
          isCaptain: true,
          isViceCaptain: true
        },
        orderBy: [
          { isCaptain: "desc" },
          { isViceCaptain: "desc" },
          { firstName: "asc" }
        ]
      },
      _count: {
        select: {
          players: true,
          tournaments: true,
          matchesAsTeamA: true,
          matchesAsTeamB: true
        }
      }
    }
  });
}

/**
 * Updates a team record.
 */
export async function updateTeam(id, data, db = prisma) {
  return db.team.update({
    where: { id },
    data,
    include: {
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
}

/**
 * Deletes a team record.
 */
export async function deleteTeam(id, db = prisma) {
  return db.team.delete({
    where: { id }
  });
}

/**
 * Finds a team by name (case-insensitive).
 */
export async function findTeamByName(name, db = prisma) {
  if (!name) return null;
  return db.team.findFirst({
    where: {
      name: {
        equals: name.trim(),
        mode: "insensitive"
      }
    }
  });
}

/**
 * Finds a team by short name (case-insensitive).
 */
export async function findTeamByShortName(shortName, db = prisma) {
  if (!shortName) return null;
  return db.team.findFirst({
    where: {
      shortName: {
        equals: shortName.trim().toUpperCase(),
        mode: "insensitive"
      }
    }
  });
}

/**
 * Finds a team by assigned manager ID.
 */
export async function findTeamByManagerId(managerId, db = prisma) {
  if (!managerId) return null;
  return db.team.findFirst({
    where: { managerId }
  });
}