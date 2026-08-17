import prisma from "../config/db.js";

/**
 * Creates a new organizer application record.
 */
export async function createOrganizerApplication(data, db = prisma) {
  return db.organizerApplication.create({
    data,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: { select: { id: true, name: true } }
        }
      }
    }
  });
}

/**
 * Finds active PENDING application for a user.
 */
export async function findPendingApplicationByUserId(userId, db = prisma) {
  return db.organizerApplication.findFirst({
    where: {
      userId,
      status: "PENDING"
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

/**
 * Finds all applications for a specific user.
 */
export async function getOrganizerApplicationsByUserId(userId, db = prisma) {
  return db.organizerApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      reviewedBy: {
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
 * Retrieves a single application by ID with applicant and reviewer details.
 */
export async function getOrganizerApplicationById(id, db = prisma) {
  return db.organizerApplication.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: { select: { id: true, name: true } }
        }
      },
      reviewedBy: {
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
 * Retrieves all applications with pagination and optional status filtering (Admin).
 */
export async function getAllOrganizerApplications({ status, page = 1, limit = 10 }, db = prisma) {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) {
    where.status = status;
  }

  const [applications, total] = await Promise.all([
    db.organizerApplication.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: { select: { id: true, name: true } }
          }
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    }),
    db.organizerApplication.count({ where })
  ]);

  return {
    applications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Updates application fields (e.g. status, reviewedById, reviewedAt, rejectionReason).
 */
export async function updateOrganizerApplication(id, data, db = prisma) {
  return db.organizerApplication.update({
    where: { id },
    data,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: { select: { id: true, name: true } }
        }
      },
      reviewedBy: {
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
