import prisma from "../config/db.js";
import {
    registerTeam,
    getAllRegisteredTeams,
    getRegistrationById,
    findRegistration,
    deleteRegistration,
    getTournamentTeams,
    getTeamTournaments
} from "../repositories/tournament-team.repository.js";

import {
    getTournamentById
} from "../repositories/tournament.repository.js";

import {
    getTeamById
} from "../repositories/team.repository.js";

import { recordAuditLog } from "../utils/auditLogger.js";
import { Roles } from "../constants/roles.js";

/*
|--------------------------------------------------------------------------
| Register Team In Tournament
|--------------------------------------------------------------------------
*/

export async function registerTeamService(data, user = null) {
    // Check Tournament
    const tournament = await getTournamentById(data.tournamentId);

    if (!tournament) {
        const error = new Error("Tournament not found.");
        error.statusCode = 404;
        throw error;
    }

    // Ownership verification for ORGANIZER role
    if (user && user.role === Roles.ORGANIZER) {
        if (tournament.organizerId && tournament.organizerId !== user.userId) {
            const error = new Error("Access denied. You can only add teams to tournaments you organize.");
            error.statusCode = 403;
            throw error;
        }
    }

    // Check Team
    const team = await getTeamById(data.teamId);

    if (!team) {
        const error = new Error("Team not found.");
        error.statusCode = 404;
        throw error;
    }

    // Tournament status validation
    if (
        tournament.status === "LIVE" ||
        tournament.status === "COMPLETED"
    ) {
        const error = new Error("Cannot register team in a live or completed tournament.");
        error.statusCode = 400;
        throw error;
    }

    // Duplicate registration check
    const existing = await findRegistration(
        data.tournamentId,
        data.teamId
    );

    if (existing) {
        const error = new Error("Team is already registered in this tournament.");
        error.statusCode = 409;
        throw error;
    }

    return prisma.$transaction(async (tx) => {
        const registration = await registerTeam(data, tx);

        // Auto-initialize points table entry for LEAGUE/ROUND_ROBIN/HYBRID tournaments
        if (tournament.format !== "KNOCKOUT") {
            const existingPt = await tx.pointsTable.findUnique({
                where: {
                    tournamentId_teamId: {
                        tournamentId: data.tournamentId,
                        teamId: data.teamId
                    }
                }
            });

            if (!existingPt) {
                await tx.pointsTable.create({
                    data: {
                        tournamentId: data.tournamentId,
                        teamId: data.teamId,
                        played: 0,
                        won: 0,
                        lost: 0,
                        tied: 0,
                        noResult: 0,
                        points: 0,
                        netRunRate: 0,
                        runsScored: 0,
                        ballsFaced: 0,
                        runsConceded: 0,
                        ballsBowled: 0
                    }
                });
            }
        }

        // Record Audit Log
        await recordAuditLog({
            userId: user ? user.userId : null,
            action: "TEAM_ADDED_TO_TOURNAMENT",
            entityType: "TOURNAMENT",
            entityId: data.tournamentId,
            metadata: {
                tournamentId: data.tournamentId,
                teamId: data.teamId,
                teamName: team.name
            },
            db: tx
        });

        console.log(`[TOURNAMENT EVENT] Team Added to Tournament | Tournament: "${tournament.name}" | Team: "${team.name}"`);
        return registration;
    }, { maxWait: 15000, timeout: 30000 });
}

/*
|--------------------------------------------------------------------------
| Get All Registrations
|--------------------------------------------------------------------------
*/

export async function getAllRegisteredTeamsService() {
    return await getAllRegisteredTeams();
}

/*
|--------------------------------------------------------------------------
| Get Registration By ID
|--------------------------------------------------------------------------
*/

export async function getRegistrationByIdService(id) {
    const registration = await getRegistrationById(id);

    if (!registration) {
        const error = new Error("Registration not found.");
        error.statusCode = 404;
        throw error;
    }

    return registration;
}

/*
|--------------------------------------------------------------------------
| Remove Team From Tournament
|--------------------------------------------------------------------------
*/

export async function deleteRegistrationService(id, user = null) {
    const registration = await getRegistrationById(id);

    if (!registration) {
        const error = new Error("Registration not found.");
        error.statusCode = 404;
        throw error;
    }

    // Ownership verification for ORGANIZER role
    if (user && user.role === Roles.ORGANIZER) {
        if (registration.tournament?.organizerId && registration.tournament.organizerId !== user.userId) {
            const error = new Error("Access denied. You can only remove teams from tournaments you organize.");
            error.statusCode = 403;
            throw error;
        }
    }

    if (
        registration.tournament.status === "LIVE" ||
        registration.tournament.status === "COMPLETED"
    ) {
        const error = new Error("Cannot remove team from a live or completed tournament.");
        error.statusCode = 400;
        throw error;
    }

    // Check if team already has scheduled matches in this tournament
    const matchCount = await prisma.match.count({
        where: {
            tournamentId: registration.tournamentId,
            OR: [
                { teamAId: registration.teamId },
                { teamBId: registration.teamId }
            ]
        }
    });

    if (matchCount > 0) {
        const error = new Error(`Cannot remove team '${registration.team?.name || registration.teamId}'. Match fixtures have already been generated with this team.`);
        error.statusCode = 409;
        throw error;
    }

    return prisma.$transaction(async (tx) => {
        // Remove points table row if exists
        await tx.pointsTable.deleteMany({
            where: {
                tournamentId: registration.tournamentId,
                teamId: registration.teamId
            }
        });

        const deleted = await deleteRegistration(id, tx);

        // Record Audit Log
        await recordAuditLog({
            userId: user ? user.userId : null,
            action: "TEAM_REMOVED_FROM_TOURNAMENT",
            entityType: "TOURNAMENT",
            entityId: registration.tournamentId,
            metadata: {
                tournamentId: registration.tournamentId,
                teamId: registration.teamId,
                teamName: registration.team?.name
            },
            db: tx
        });

        console.log(`[TOURNAMENT EVENT] Team Removed from Tournament | Tournament: "${registration.tournament?.name}" | Team: "${registration.team?.name}"`);
        return deleted;
    }, { maxWait: 15000, timeout: 30000 });
}

/*
|--------------------------------------------------------------------------
| Get Teams Of Tournament with Roster Readiness
|--------------------------------------------------------------------------
*/

export async function getTournamentTeamsService(tournamentId) {
    const tournament = await getTournamentById(tournamentId);

    if (!tournament) {
        const error = new Error("Tournament not found.");
        error.statusCode = 404;
        throw error;
    }

    const registrations = await getTournamentTeams(tournamentId);

    return registrations.map((reg) => {
        const team = reg.team;
        const playerCount = team?.players?.length || 0;

        let rosterStatus = "NO_PLAYERS";
        if (playerCount >= 11) {
            rosterStatus = "READY";
        } else if (playerCount > 0) {
            rosterStatus = "INCOMPLETE";
        }

        return {
            id: reg.id,
            registrationId: reg.id,
            tournamentId: reg.tournamentId,
            teamId: reg.teamId,
            createdAt: reg.createdAt,
            rosterStatus,
            playerCount,
            isReady: playerCount >= 11,
            team: {
                id: team.id,
                name: team.name,
                shortName: team.shortName,
                logoUrl: team.logoUrl,
                city: team.city,
                description: team.description,
                managerId: team.managerId,
                manager: team.manager,
                playerCount,
                rosterStatus,
                isReady: playerCount >= 11,
                players: team.players || []
            }
        };
    });
}

/*
|--------------------------------------------------------------------------
| Get Tournaments Of Team
|--------------------------------------------------------------------------
*/

export async function getTeamTournamentsService(teamId) {
    const team = await getTeamById(teamId);

    if (!team) {
        const error = new Error("Team not found.");
        error.statusCode = 404;
        throw error;
    }

    return await getTeamTournaments(teamId);
}