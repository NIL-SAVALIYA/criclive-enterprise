import prisma from "../config/db.js";

/**
 * Creates a new player record.
 */
export async function createPlayer(data, db = prisma) {
  return db.player.create({
    data,
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
  });
}

/**
 * Retrieves players with search, filtering, and pagination.
 */
export async function getAllPlayers(params = {}, db = prisma) {
  const { page = 1, limit = 10, search, teamId, playerType } = params;
  const skip = (page - 1) * limit;

  const where = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } }
    ];
  }

  if (teamId) {
    where.teamId = teamId;
  }

  if (playerType) {
    where.playerType = playerType;
  }

  const [players, total] = await Promise.all([
    db.player.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { teamId: "asc" },
        { jerseyNumber: "asc" },
        { firstName: "asc" }
      ],
      include: {
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            logoUrl: true
          }
        },
        _count: {
          select: {
            battingScorecards: true,
            bowlingScorecards: true,
            playingXI: true
          }
        }
      }
    }),
    db.player.count({ where })
  ]);

  return {
    players,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Retrieves a player by ID with team details and career scorecard counts.
 */
export async function getPlayerById(id, db = prisma) {
  return db.player.findUnique({
    where: { id },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logoUrl: true,
          city: true
        }
      },
      _count: {
        select: {
          battingScorecards: true,
          bowlingScorecards: true,
          playingXI: true,
          battingBalls: true,
          bowlingBalls: true,
          dismissals: true,
          fieldingBalls: true
        }
      }
    }
  });
}

/**
 * Updates a player record.
 */
export async function updatePlayer(id, data, db = prisma) {
  return db.player.update({
    where: { id },
    data,
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
  });
}

/**
 * Deletes a player record.
 */
export async function deletePlayer(id, db = prisma) {
  return db.player.delete({
    where: { id }
  });
}

/**
 * Retrieves all players in a specific team.
 */
export async function getPlayersByTeam(teamId, db = prisma) {
  return db.player.findMany({
    where: { teamId },
    orderBy: [
      { isCaptain: "desc" },
      { isViceCaptain: "desc" },
      { jerseyNumber: "asc" }
    ],
    include: {
      team: {
        select: {
          id: true,
          name: true,
          shortName: true
        }
      }
    }
  });
}

/**
 * Finds a player by team ID and jersey number for uniqueness checks within team.
 */
export async function findPlayerByJerseyNumber(teamId, jerseyNumber, db = prisma) {
  if (!teamId || jerseyNumber === undefined || jerseyNumber === null) return null;
  return db.player.findFirst({
    where: {
      teamId,
      jerseyNumber
    }
  });
}