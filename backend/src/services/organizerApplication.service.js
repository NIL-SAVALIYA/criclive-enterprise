import prisma from "../config/db.js";
import {
  createOrganizerApplication,
  getOrganizerApplicationsByUserId,
  getOrganizerApplicationById,
  getAllOrganizerApplications,
  updateOrganizerApplication
} from "../repositories/organizerApplication.repository.js";
import { findUserById, findRoleByName, updateUser } from "../repositories/user.repository.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { Roles } from "../constants/roles.js";

/**
 * Validates organizer details and automatically activates ORGANIZER role for the authenticated user.
 */
export async function submitOrganizerApplicationService(userId, applicationData) {
  const user = await findUserById(userId);
  if (!user) {
    const error = new Error("User account not found.");
    error.statusCode = 404;
    throw error;
  }

  // Check if user is already an organizer or administrator
  if (user.role?.name === Roles.ORGANIZER || user.role?.name === Roles.ADMIN || user.role?.name === Roles.SUPER_ADMIN) {
    const error = new Error("Your account already has organizer or administrative privileges.");
    error.statusCode = 400;
    throw error;
  }

  // Check if user was suspended by an administrator (indexed query)
  const recentSuspension = await prisma.organizerApplication.findFirst({
    where: {
      userId,
      status: "REJECTED",
      rejectionReason: {
        startsWith: "SUSPENDED"
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (recentSuspension) {
    const error = new Error("Your account has been suspended from organizer privileges by an administrator. Please contact support.");
    error.statusCode = 403;
    throw error;
  }

  const organizerRole = await findRoleByName(Roles.ORGANIZER);
  if (!organizerRole) {
    const error = new Error("ORGANIZER role definition not found in database.");
    error.statusCode = 500;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      // 1. Atomically promote user to ORGANIZER
      const updatedUser = await updateUser(
        userId,
        { roleId: organizerRole.id },
        tx
      );

      // 2. Create approved organizer application record for audit & history
      const application = await createOrganizerApplication(
        {
          userId,
          organizationName: applicationData.organizationName.trim(),
          organizationType: applicationData.organizationType?.trim() || null,
          phone: applicationData.phone?.trim() || null,
          city: applicationData.city?.trim() || null,
          description: applicationData.description?.trim() || null,
          status: "APPROVED",
          reviewedAt: new Date()
        },
        tx
      );

      // 3. Record Audit Trail
      await recordAuditLog({
        userId,
        action: "ORGANIZER_ACTIVATED",
        entityType: "ORGANIZER_APPLICATION",
        entityId: application.id,
        metadata: {
          organizationName: application.organizationName,
          applicantEmail: user.email,
          activatedRole: Roles.ORGANIZER
        },
        db: tx
      });

      // 4. In-app notification for user
      await tx.notification.create({
        data: {
          type: "ORGANIZER_ACTIVATED",
          title: "Organizer Privileges Activated",
          message: `Welcome ${user.firstName}! Your organizer profile for "${application.organizationName}" is now active. You can now create and manage tournaments.`
        }
      }).catch((err) => console.error("Notification trigger error:", err.message));

      return {
        application,
        user: updatedUser,
        role: Roles.ORGANIZER
      };
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Suspends an organizer and demotes account back to VIEWER (Admin only).
 */
export async function suspendOrganizerService(organizerUserId, reason, adminUser) {
  const targetUser = await findUserById(organizerUserId);
  if (!targetUser) {
    const error = new Error("Target user account not found.");
    error.statusCode = 404;
    throw error;
  }

  if (targetUser.role?.name === Roles.ADMIN || targetUser.role?.name === Roles.SUPER_ADMIN) {
    const error = new Error("Cannot suspend platform administrators.");
    error.statusCode = 400;
    throw error;
  }

  const viewerRole = await findRoleByName(Roles.VIEWER);
  if (!viewerRole) {
    const error = new Error("VIEWER role definition not found in database.");
    error.statusCode = 500;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      // Demote user to VIEWER
      const updatedUser = await updateUser(
        organizerUserId,
        { roleId: viewerRole.id },
        tx
      );

      // Update latest application record if present
      const latestApp = await prisma.organizerApplication.findFirst({
        where: { userId: organizerUserId },
        orderBy: { createdAt: "desc" }
      });

      if (latestApp) {
        await updateOrganizerApplication(
          latestApp.id,
          {
            status: "REJECTED",
            rejectionReason: `SUSPENDED: ${reason.trim()}`,
            reviewedById: adminUser.userId,
            reviewedAt: new Date()
          },
          tx
        );
      }

      // Record Audit Log
      await recordAuditLog({
        userId: adminUser.userId,
        action: "ORGANIZER_SUSPENDED",
        entityType: "USER",
        entityId: organizerUserId,
        metadata: {
          suspendedUserId: organizerUserId,
          suspendedUserEmail: targetUser.email,
          reason: reason.trim()
        },
        db: tx
      });

      // In-app notification for suspended user
      await tx.notification.create({
        data: {
          type: "ORGANIZER_SUSPENDED",
          title: "Organizer Privileges Suspended",
          message: `Your organizer privileges have been suspended by an administrator. Reason: ${reason.trim()}`
        }
      }).catch((err) => console.error("Notification trigger error:", err.message));

      return {
        success: true,
        message: "Organizer privileges suspended successfully.",
        user: updatedUser
      };
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Retrieves applications submitted by the current user.
 */
export async function getMyApplicationsService(userId) {
  return getOrganizerApplicationsByUserId(userId);
}

/**
 * Retrieves all applications with pagination and filters (Admin).
 */
export async function getAllOrganizerApplicationsService(queryParams = {}) {
  return getAllOrganizerApplications(queryParams);
}

/**
 * Retrieves a single application by ID with ownership/admin access check.
 */
export async function getOrganizerApplicationByIdService(id, requestingUser) {
  const application = await getOrganizerApplicationById(id);
  if (!application) {
    const error = new Error("Organizer application not found.");
    error.statusCode = 404;
    throw error;
  }

  const isAdmin =
    requestingUser.role === Roles.ADMIN ||
    requestingUser.role === Roles.SUPER_ADMIN;

  if (!isAdmin && application.userId !== requestingUser.userId) {
    const error = new Error("Access denied. You do not have permission to view this application.");
    error.statusCode = 403;
    throw error;
  }

  return application;
}

/**
 * Reviews (Approves or Rejects) an organizer application manually (Admin).
 */
export async function reviewOrganizerApplicationService(id, reviewData, adminUser) {
  const application = await getOrganizerApplicationById(id);
  if (!application) {
    const error = new Error("Organizer application not found.");
    error.statusCode = 404;
    throw error;
  }

  const { status, rejectionReason } = reviewData;

  return prisma.$transaction(
    async (tx) => {
      // 1. If APPROVED, promote existing user's role to ORGANIZER
      if (status === "APPROVED") {
        const organizerRole = await findRoleByName(Roles.ORGANIZER, tx);
        if (!organizerRole) {
          const error = new Error("ORGANIZER role definition not found in database.");
          error.statusCode = 500;
          throw error;
        }

        await updateUser(
          application.userId,
          { roleId: organizerRole.id },
          tx
        );
      } else if (status === "REJECTED") {
        const viewerRole = await findRoleByName(Roles.VIEWER, tx);
        if (viewerRole) {
          await updateUser(
            application.userId,
            { roleId: viewerRole.id },
            tx
          );
        }
      }

      // 2. Update Application Status & Reviewer metadata
      const updatedApplication = await updateOrganizerApplication(
        id,
        {
          status,
          reviewedById: adminUser.userId,
          reviewedAt: new Date(),
          rejectionReason: status === "REJECTED" ? rejectionReason?.trim() : null
        },
        tx
      );

      // 3. Record Audit Log
      await recordAuditLog({
        userId: adminUser.userId,
        action: status === "APPROVED" ? "ORGANIZER_APPLICATION_APPROVED" : "ORGANIZER_APPLICATION_REJECTED",
        entityType: "ORGANIZER_APPLICATION",
        entityId: id,
        metadata: {
          applicantUserId: application.userId,
          organizationName: application.organizationName,
          status,
          rejectionReason: status === "REJECTED" ? rejectionReason : undefined
        },
        db: tx
      });

      // 4. Create Notification for applicant
      await tx.notification.create({
        data: {
          type: status === "APPROVED" ? "ORGANIZER_APPROVED" : "ORGANIZER_REJECTED",
          title: status === "APPROVED" ? "Organizer Access Approved" : "Organizer Application Rejected",
          message:
            status === "APPROVED"
              ? `Congratulations! Your organizer application for "${application.organizationName}" has been approved. You can now create and manage tournaments.`
              : `Your organizer application for "${application.organizationName}" was rejected. Reason: ${rejectionReason}`
        }
      }).catch((err) => console.error("Notification trigger error:", err.message));

      return updatedApplication;
    },
    { maxWait: 15000, timeout: 30000 }
  );
}
