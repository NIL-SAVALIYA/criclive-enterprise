import {
  createManagerAssignment,
  findManagerAssignmentById,
  findActiveAssignmentForTeamInMatch,
  findActiveAssignmentForManagerInMatch,
  updateManagerAssignment,
  findManagerProfileById,
  findManagerProfileByNormalizedNickname,
  getAssignmentsByMatch
} from "../repositories/manager.repository.js";
import { getMatchById } from "../repositories/match.repository.js";
import { Roles } from "../constants/roles.js";
import {
  emitManagerAssignmentCreated,
  emitManagerAssignmentAccepted,
  emitManagerAssignmentDeclined,
  emitManagerAssignmentCancelled,
  emitManagerAssignmentRevoked
} from "../socket/socket.server.js";

/**
 * Request Manager Assignment (Organizer / Admin -> Manager)
 */
export async function requestManagerAssignmentService(
  matchId,
  teamId,
  managerIdentifier,
  assignedByUser
) {
  const match = await getMatchById(matchId);
  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }

  if (match.status !== "UPCOMING") {
    const error = new Error(`Cannot assign a manager for a match with status '${match.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  // Check authorization
  const userId = assignedByUser.userId || assignedByUser.id;
  const isSuperOrAdmin =
    assignedByUser.role === Roles.ADMIN || assignedByUser.role === Roles.SUPER_ADMIN;
  const isTournamentOrganizer =
    match.tournament?.organizerId && match.tournament.organizerId === userId;

  if (!isSuperOrAdmin && !isTournamentOrganizer) {
    const error = new Error(
      "Access denied. Only the tournament organizer or an administrator can assign managers."
    );
    error.statusCode = 403;
    throw error;
  }

  // Verify team belongs to match
  if (teamId !== match.teamAId && teamId !== match.teamBId) {
    const error = new Error("Selected team is not part of this match.");
    error.statusCode = 400;
    throw error;
  }

  // Find target manager profile
  let targetProfile = await findManagerProfileById(managerIdentifier);
  if (!targetProfile) {
    const normalized = managerIdentifier.trim().toLowerCase().replace(/^@/, "");
    targetProfile = await findManagerProfileByNormalizedNickname(normalized);
  }

  if (!targetProfile) {
    const error = new Error("Manager profile not found. The user must register as a Manager first.");
    error.statusCode = 404;
    throw error;
  }

  if (!targetProfile.isActive) {
    const error = new Error("Manager profile is currently inactive and cannot receive new assignments.");
    error.statusCode = 400;
    throw error;
  }

  // Conflict Check 1: Manager already assigned in this match (for either team)
  const existingManagerAssignment = await findActiveAssignmentForManagerInMatch(
    matchId,
    targetProfile.id
  );
  if (existingManagerAssignment) {
    const assignedTeamName = existingManagerAssignment.team?.name || "another team";
    const error = new Error(
      `This manager already has an active assignment for ${assignedTeamName} in this match.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Conflict Check 2: Team already has an active manager in this match
  const existingTeamAssignment = await findActiveAssignmentForTeamInMatch(matchId, teamId);
  if (existingTeamAssignment) {
    const currentMgr =
      existingTeamAssignment.managerProfile?.user?.firstName || "another manager";
    const error = new Error(
      `This team already has an active or pending manager assignment (${currentMgr}) for this match.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Create Assignment
  const assignment = await createManagerAssignment({
    managerProfileId: targetProfile.id,
    matchId,
    teamId,
    assignedByUserId: userId,
    status: "PENDING"
  });

  // Real-time notification emit
  emitManagerAssignmentCreated(targetProfile.userId, assignment);

  return assignment;
}

/**
 * Accept Manager Assignment Request (Manager action)
 */
export async function acceptManagerAssignmentService(assignmentId, user) {
  const assignment = await findManagerAssignmentById(assignmentId);
  if (!assignment) {
    const error = new Error("Manager assignment not found.");
    error.statusCode = 404;
    throw error;
  }

  const userId = user.userId || user.id;

  if (assignment.managerProfile.userId !== userId) {
    const error = new Error("Access denied. You can only respond to your own assignment requests.");
    error.statusCode = 403;
    throw error;
  }

  if (assignment.status !== "PENDING") {
    const error = new Error(`Cannot accept an assignment with status '${assignment.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  if (assignment.match.status !== "UPCOMING") {
    const error = new Error(`Cannot accept assignment for a match that is already '${assignment.match.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const updated = await updateManagerAssignment(assignment.id, {
    status: "ACCEPTED",
    respondedAt: now,
    acceptedAt: now
  });

  // Real-time emit
  emitManagerAssignmentAccepted(assignment.match.tournament?.id, assignment.matchId, updated);

  return updated;
}

/**
 * Decline Manager Assignment Request (Manager action)
 */
export async function declineManagerAssignmentService(assignmentId, user, reason = null) {
  const assignment = await findManagerAssignmentById(assignmentId);
  if (!assignment) {
    const error = new Error("Manager assignment not found.");
    error.statusCode = 404;
    throw error;
  }

  const userId = user.userId || user.id;

  if (assignment.managerProfile.userId !== userId) {
    const error = new Error("Access denied. You can only respond to your own assignment requests.");
    error.statusCode = 403;
    throw error;
  }

  if (assignment.status !== "PENDING") {
    const error = new Error(`Cannot decline an assignment with status '${assignment.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const updated = await updateManagerAssignment(assignment.id, {
    status: "DECLINED",
    respondedAt: now,
    declinedAt: now,
    notes: reason || null
  });

  // Real-time emit
  emitManagerAssignmentDeclined(assignment.match.tournament?.id, assignment.matchId, updated);

  return updated;
}

/**
 * Cancel Manager Assignment Request (Organizer / Admin action on PENDING request)
 */
export async function cancelManagerAssignmentService(assignmentId, user) {
  const assignment = await findManagerAssignmentById(assignmentId);
  if (!assignment) {
    const error = new Error("Manager assignment not found.");
    error.statusCode = 404;
    throw error;
  }

  const userId = user.userId || user.id;
  const isSuperOrAdmin = user.role === Roles.ADMIN || user.role === Roles.SUPER_ADMIN;
  const isOrganizer = assignment.match.tournament?.organizerId === userId;
  const isAssigner = assignment.assignedByUserId === userId;

  if (!isSuperOrAdmin && !isOrganizer && !isAssigner) {
    const error = new Error("Access denied. You cannot cancel this assignment request.");
    error.statusCode = 403;
    throw error;
  }

  if (assignment.status !== "PENDING") {
    const error = new Error(`Cannot cancel an assignment that is not PENDING (current status: '${assignment.status}').`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const updated = await updateManagerAssignment(assignment.id, {
    status: "CANCELLED",
    cancelledAt: now
  });

  emitManagerAssignmentCancelled(assignment.managerProfile.userId, updated);

  return updated;
}

/**
 * Revoke Manager Assignment (Organizer / Admin action on ACCEPTED assignment)
 */
export async function revokeManagerAssignmentService(assignmentId, user, reason = null) {
  const assignment = await findManagerAssignmentById(assignmentId);
  if (!assignment) {
    const error = new Error("Manager assignment not found.");
    error.statusCode = 404;
    throw error;
  }

  const userId = user.userId || user.id;
  const isSuperOrAdmin = user.role === Roles.ADMIN || user.role === Roles.SUPER_ADMIN;
  const isOrganizer = assignment.match.tournament?.organizerId === userId;

  if (!isSuperOrAdmin && !isOrganizer) {
    const error = new Error("Access denied. Only the organizer or admin can revoke an accepted assignment.");
    error.statusCode = 403;
    throw error;
  }

  if (assignment.status !== "ACCEPTED") {
    const error = new Error(`Cannot revoke an assignment that is not ACCEPTED (current status: '${assignment.status}').`);
    error.statusCode = 400;
    throw error;
  }

  if (assignment.match.status !== "UPCOMING") {
    const error = new Error(`Cannot revoke assignment for a match that is already '${assignment.match.status}'.`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const updated = await updateManagerAssignment(assignment.id, {
    status: "REVOKED",
    revokedAt: now,
    notes: reason || null
  });

  emitManagerAssignmentRevoked(assignment.managerProfile.userId, updated);

  return updated;
}

/**
 * Get all manager assignments for a match
 */
export async function getMatchManagerAssignmentsService(matchId) {
  const match = await getMatchById(matchId);
  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }

  return getAssignmentsByMatch(matchId);
}
