import prisma from "../config/db.js";

/**
 * Manager Profile Repository
 */
export async function createManagerProfile(data, db = prisma) {
  return db.managerProfile.create({
    data: {
      userId: data.userId,
      nickname: data.nickname,
      normalizedNickname: data.normalizedNickname,
      displayName: data.displayName || null,
      bio: data.bio || null,
      profileImageUrl: data.profileImageUrl || null,
      phone: data.phone || null,
      city: data.city || null,
      isActive: data.isActive ?? true
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          profileImageUrl: true,
          role: { select: { id: true, name: true } }
        }
      }
    }
  });
}

export async function findManagerProfileByUserId(userId, db = prisma) {
  return db.managerProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          profileImageUrl: true,
          role: { select: { id: true, name: true } }
        }
      },
      assignments: {
        include: {
          team: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          match: {
            select: {
              id: true,
              venue: true,
              matchDate: true,
              status: true,
              tournament: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { requestedAt: "desc" }
      }
    }
  });
}

export async function findManagerProfileByNormalizedNickname(normalizedNickname, db = prisma) {
  return db.managerProfile.findUnique({
    where: { normalizedNickname },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImageUrl: true
        }
      }
    }
  });
}

export async function findManagerProfileById(id, db = prisma) {
  return db.managerProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          profileImageUrl: true
        }
      }
    }
  });
}

export async function updateManagerProfile(id, data, db = prisma) {
  return db.managerProfile.update({
    where: { id },
    data,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          profileImageUrl: true
        }
      }
    }
  });
}

export async function searchActiveManagers(query = "", limit = 20, db = prisma) {
  const cleanQuery = query ? query.trim().toLowerCase().replace(/^@/, "") : "";

  const whereClause = {
    isActive: true
  };

  if (cleanQuery) {
    whereClause.OR = [
      { normalizedNickname: { contains: cleanQuery, mode: "insensitive" } },
      { displayName: { contains: cleanQuery, mode: "insensitive" } },
      {
        user: {
          OR: [
            { firstName: { contains: cleanQuery, mode: "insensitive" } },
            { lastName: { contains: cleanQuery, mode: "insensitive" } }
          ]
        }
      }
    ];
  }

  const profiles = await db.managerProfile.findMany({
    where: whereClause,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImageUrl: true,
          role: { select: { id: true, name: true } }
        }
      },
      _count: {
        select: {
          assignments: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    nickname: p.nickname,
    displayName: p.displayName || `${p.user.firstName} ${p.user.lastName}`,
    bio: p.bio,
    profileImageUrl: p.profileImageUrl || p.user.profileImageUrl,
    city: p.city,
    phone: p.phone,
    isActive: p.isActive,
    user: p.user,
    totalAssignments: p._count.assignments
  }));
}

/**
 * Manager Assignment Repository
 */
export async function createManagerAssignment(data, db = prisma) {
  return db.managerAssignment.create({
    data: {
      managerProfileId: data.managerProfileId,
      matchId: data.matchId,
      teamId: data.teamId,
      assignedByUserId: data.assignedByUserId,
      status: data.status || "PENDING",
      notes: data.notes || null
    },
    include: {
      managerProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true
            }
          }
        }
      },
      team: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logoUrl: true,
          city: true
        }
      },
      match: {
        include: {
          tournament: { select: { id: true, name: true, format: true } },
          teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } }
        }
      },
      assignedByUser: {
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

export async function findManagerAssignmentById(id, db = prisma) {
  return db.managerAssignment.findUnique({
    where: { id },
    include: {
      managerProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true
            }
          }
        }
      },
      team: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logoUrl: true,
          city: true
        }
      },
      match: {
        include: {
          tournament: { select: { id: true, name: true, format: true, organizerId: true } },
          teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          playingXI: { select: { id: true, teamId: true, playerId: true, battingOrder: true, isCaptain: true, isWicketKeeper: true } }
        }
      },
      assignedByUser: {
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

export async function findActiveAssignmentForTeamInMatch(matchId, teamId, db = prisma) {
  return db.managerAssignment.findFirst({
    where: {
      matchId,
      teamId,
      status: { in: ["PENDING", "ACCEPTED"] }
    },
    include: {
      managerProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    }
  });
}

export async function findActiveAssignmentForManagerInMatch(matchId, managerProfileId, db = prisma) {
  return db.managerAssignment.findFirst({
    where: {
      matchId,
      managerProfileId,
      status: { in: ["PENDING", "ACCEPTED"] }
    },
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

export async function updateManagerAssignment(id, data, db = prisma) {
  return db.managerAssignment.update({
    where: { id },
    data,
    include: {
      managerProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true
            }
          }
        }
      },
      team: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logoUrl: true
        }
      },
      match: {
        include: {
          tournament: { select: { id: true, name: true, format: true, organizerId: true } },
          teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } }
        }
      },
      assignedByUser: {
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

export async function getAssignmentsByManagerProfile(managerProfileId, statusFilter = null, db = prisma) {
  const where = { managerProfileId };
  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      where.status = { in: statusFilter };
    } else {
      where.status = statusFilter;
    }
  }

  return db.managerAssignment.findMany({
    where,
    include: {
      team: {
        include: {
          players: true
        }
      },
      match: {
        include: {
          tournament: { select: { id: true, name: true, format: true, organizerId: true } },
          teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          playingXI: { select: { id: true, teamId: true, playerId: true, battingOrder: true, isCaptain: true, isWicketKeeper: true } }
        }
      },
      assignedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { requestedAt: "desc" }
  });
}

export async function getAssignmentsByMatch(matchId, db = prisma) {
  return db.managerAssignment.findMany({
    where: { matchId },
    include: {
      managerProfile: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true
            }
          }
        }
      },
      team: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logoUrl: true
        }
      },
      assignedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}
