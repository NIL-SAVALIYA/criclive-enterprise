import prisma from "../config/db.js";
import {
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  findTeamByName,
  findTeamByShortName,
  findTeamByManagerId
} from "../repositories/team.repository.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { Roles } from "../constants/roles.js";

/**
 * Creates a team with duplicate name/shortName guards and manager check.
 */
export async function createTeamService(teamData) {
  const name = teamData.name.trim();
  const shortName = teamData.shortName.trim().toUpperCase();

  const existingName = await findTeamByName(name);
  if (existingName) {
    const error = new Error("Team name already exists.");
    error.statusCode = 409;
    throw error;
  }

  const existingShortName = await findTeamByShortName(shortName);
  if (existingShortName) {
    const error = new Error("Team short name already exists.");
    error.statusCode = 409;
    throw error;
  }

  if (teamData.managerId) {
    const existingManagerTeam = await findTeamByManagerId(teamData.managerId);
    if (existingManagerTeam) {
      const error = new Error(`User is already managing team '${existingManagerTeam.name}'.`);
      error.statusCode = 400;
      throw error;
    }
  }

  return prisma.$transaction(
    async (tx) => {
      const team = await createTeam(
        {
          ...teamData,
          name,
          shortName
        },
        tx
      );

      console.log(`[TEAM EVENT] Team Created | ID: ${team.id} | Name: "${team.name}" (${team.shortName})`);
      return team;
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Retrieves all teams with pagination and search.
 */
export async function getAllTeamsService(params = {}) {
  return await getAllTeams(params);
}

/**
 * Retrieves a team by ID.
 */
export async function getTeamByIdService(id) {
  const team = await getTeamById(id);
  if (!team) {
    const error = new Error("Team not found.");
    error.statusCode = 404;
    throw error;
  }
  return team;
}

/**
 * Updates a team with uniqueness, organizer ownership, and manager assignment guards.
 */
export async function updateTeamService(id, teamData, currentUser = null) {
  const team = await getTeamById(id);
  if (!team) {
    const error = new Error("Team not found.");
    error.statusCode = 404;
    throw error;
  }

  // RBAC scope check for TEAM_MANAGER role
  if (currentUser && currentUser.role === Roles.TEAM_MANAGER && team.managerId !== currentUser.userId) {
    const error = new Error("Access denied. You can only update your assigned team.");
    error.statusCode = 403;
    throw error;
  }

  // Ownership verification for ORGANIZER role
  if (currentUser && currentUser.role === Roles.ORGANIZER) {
    const isOrganizedTeam = await prisma.tournamentTeam.findFirst({
      where: {
        teamId: id,
        tournament: {
          organizerId: currentUser.userId
        }
      }
    });

    if (!isOrganizedTeam) {
      const error = new Error("Access denied. You can only manage teams participating in your tournaments.");
      error.statusCode = 403;
      throw error;
    }
  }

  if (teamData.name && teamData.name.trim().toLowerCase() !== team.name.toLowerCase()) {
    const existingName = await findTeamByName(teamData.name.trim());
    if (existingName) {
      const error = new Error("Team name already exists.");
      error.statusCode = 409;
      throw error;
    }
  }

  if (teamData.shortName && teamData.shortName.trim().toUpperCase() !== team.shortName.toUpperCase()) {
    const existingShortName = await findTeamByShortName(teamData.shortName.trim().toUpperCase());
    if (existingShortName) {
      const error = new Error("Team short name already exists.");
      error.statusCode = 409;
      throw error;
    }
  }

  let managerAction = null;
  if ("managerId" in teamData && teamData.managerId !== team.managerId) {
    if (teamData.managerId) {
      const managerUser = await prisma.user.findUnique({
        where: { id: teamData.managerId },
        include: { role: true }
      });

      if (!managerUser) {
        const error = new Error("Selected manager user not found.");
        error.statusCode = 404;
        throw error;
      }

      if (!managerUser.isActive) {
        const error = new Error("Cannot assign inactive or suspended user as team manager.");
        error.statusCode = 400;
        throw error;
      }

      if (managerUser.role?.name !== "TEAM_MANAGER" && managerUser.role?.name !== "ADMIN") {
        const error = new Error("Selected user must have the TEAM_MANAGER role.");
        error.statusCode = 400;
        throw error;
      }

      const existingManagerTeam = await findTeamByManagerId(teamData.managerId);
      if (existingManagerTeam && existingManagerTeam.id !== id) {
        const error = new Error(`User is already managing team '${existingManagerTeam.name}'.`);
        error.statusCode = 400;
        throw error;
      }

      managerAction = team.managerId ? "TEAM_MANAGER_CHANGED" : "TEAM_MANAGER_ASSIGNED";
    } else {
      managerAction = "TEAM_MANAGER_REMOVED";
    }
  }

  const payload = {
    ...teamData,
    ...(teamData.name && { name: teamData.name.trim() }),
    ...(teamData.shortName && { shortName: teamData.shortName.trim().toUpperCase() })
  };

  return prisma.$transaction(async (tx) => {
    const updated = await updateTeam(id, payload, tx);

    if (managerAction) {
      await recordAuditLog({
        userId: currentUser ? currentUser.userId : null,
        action: managerAction,
        entityType: "TEAM",
        entityId: id,
        metadata: {
          teamId: id,
          teamName: updated.name,
          previousManagerId: team.managerId,
          newManagerId: updated.managerId
        },
        db: tx
      });

      if (updated.managerId) {
        await tx.notification.create({
          data: {
            type: "MANAGER_ASSIGNMENT",
            title: "Team Manager Assignment",
            message: `You have been assigned as manager of ${updated.name}.`
          }
        });
      }
    }

    console.log(`[TEAM EVENT] Team Updated | ID: ${updated.id} | Name: "${updated.name}"`);
    return updated;
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Deletes a team with delete-protection guards.
 */
export async function deleteTeamService(id) {
  const team = await getTeamById(id);
  if (!team) {
    const error = new Error("Team not found.");
    error.statusCode = 404;
    throw error;
  }

  const playerCount = team._count?.players || 0;
  const tournamentCount = team._count?.tournaments || 0;
  const matchACount = team._count?.matchesAsTeamA || 0;
  const matchBCount = team._count?.matchesAsTeamB || 0;
  const totalMatches = matchACount + matchBCount;

  if (playerCount > 0 || tournamentCount > 0 || totalMatches > 0) {
    const reasons = [];
    if (playerCount > 0) reasons.push(`${playerCount} active player(s)`);
    if (tournamentCount > 0) reasons.push(`${tournamentCount} registered tournament(s)`);
    if (totalMatches > 0) reasons.push(`${totalMatches} match(es)`);

    const error = new Error(`Cannot delete team '${team.name}'. It is referenced by: ${reasons.join(", ")}.`);
    error.statusCode = 409;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const result = await deleteTeam(id, tx);
    console.log(`[TEAM EVENT] Team Deleted | ID: ${id} | Name: "${team.name}"`);
    return result;
  });
}

/*
|--------------------------------------------------------------------------
| ARCHITECTURAL EXTENSION HOOKS (FUTURE READY - TASK 13)
|--------------------------------------------------------------------------
| - processPlayerTransfer(playerId, sourceTeamId, targetTeamId, transferFee): Transfer window engine
| - validateSalaryCap(teamId, newContractValue): Financial Fair Play / Salary Cap engine
| - assignFranchiseOwner(teamId, ownerId): Multi-tier ownership model
| - registerAcademySquad(parentTeamId, academyData): Reserve & Academy team relations
|--------------------------------------------------------------------------
*/