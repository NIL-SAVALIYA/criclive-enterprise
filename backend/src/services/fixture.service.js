import prisma from "../config/db.js";
import { getTournamentById } from "../repositories/tournament.repository.js";
import { getTournamentTeams } from "../repositories/tournament-team.repository.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { Roles } from "../constants/roles.js";

/*
|--------------------------------------------------------------------------
| Generate Tournament Fixtures
|--------------------------------------------------------------------------
*/

export async function generateFixturesService(
    tournamentId,
    options = {},
    user = null
) {
    const venue = typeof options === "string" ? options : (options.venue || "TBD");
    const regenerate = Boolean(options.regenerate);
    const customStartDate = options.startDate ? new Date(options.startDate) : null;
    const format = options.format;

    // Check Tournament
    const tournament = await getTournamentById(tournamentId);

    if (!tournament) {
        const error = new Error("Tournament not found.");
        error.statusCode = 404;
        throw error;
    }

    // Ownership verification for ORGANIZER role
    if (user && user.role === Roles.ORGANIZER) {
        if (tournament.organizerId && tournament.organizerId !== user.userId) {
            const error = new Error("Access denied. You can only generate fixtures for tournaments you organize.");
            error.statusCode = 403;
            throw error;
        }
    }

    // Tournament must be UPCOMING
    if (tournament.status !== "UPCOMING") {
        const error = new Error("Fixtures can only be generated for upcoming tournaments.");
        error.statusCode = 400;
        throw error;
    }

    // Check existing matches
    const existingMatches = await prisma.match.findMany({
        where: { tournamentId }
    });

    if (existingMatches.length > 0) {
        if (!regenerate) {
            const error = new Error("Fixtures have already been generated for this tournament.");
            error.statusCode = 400;
            throw error;
        }

        const hasActiveOrCompleted = existingMatches.some(
            (m) => m.status === "LIVE" || m.status === "COMPLETED"
        );
        if (hasActiveOrCompleted) {
            const error = new Error("Cannot regenerate fixtures because some matches are already live or completed.");
            error.statusCode = 400;
            throw error;
        }

        await prisma.match.deleteMany({
            where: { tournamentId, status: "UPCOMING" }
        });
    }

    // Get Registered Teams
    const registrations = await getTournamentTeams(tournamentId);

    if (registrations.length < 2) {
        const error = new Error("Minimum two teams are required to generate fixtures.");
        error.statusCode = 400;
        throw error;
    }

    const fixtures = [];
    let matchDate = customStartDate || new Date(tournament.startDate);
    const tournamentFormat = format || tournament.format || "LEAGUE";

    if (tournamentFormat === "KNOCKOUT") {
        // Knockout fixture pairings: pair teams in sequential brackets
        for (let i = 0; i < registrations.length; i += 2) {
            if (i + 1 < registrations.length) {
                fixtures.push({
                    tournamentId,
                    teamAId: registrations[i].teamId,
                    teamBId: registrations[i + 1].teamId,
                    venue,
                    matchDate: new Date(matchDate)
                });
                matchDate.setDate(matchDate.getDate() + 1);
            }
        }
    } else {
        // Round Robin Algorithm (all teams play each other)
        for (let i = 0; i < registrations.length; i++) {
            for (let j = i + 1; j < registrations.length; j++) {
                fixtures.push({
                    tournamentId,
                    teamAId: registrations[i].teamId,
                    teamBId: registrations[j].teamId,
                    venue,
                    matchDate: new Date(matchDate)
                });

                // Next match scheduled next day
                matchDate.setDate(matchDate.getDate() + 1);
            }
        }
    }

    return prisma.$transaction(async (tx) => {
        await tx.match.createMany({
            data: fixtures
        });

        // Record Audit Log
        await recordAuditLog({
            userId: user ? user.userId : null,
            action: "FIXTURES_GENERATED",
            entityType: "TOURNAMENT",
            entityId: tournamentId,
            metadata: {
                tournamentId,
                tournamentName: tournament.name,
                format: tournamentFormat,
                totalMatches: fixtures.length,
                teamsCount: registrations.length
            },
            db: tx
        });

        // Create notification
        await tx.notification.create({
            data: {
                type: "FIXTURES_GENERATED",
                title: "Fixtures Generated",
                message: `Fixture schedule generated successfully for ${tournament.name} (${fixtures.length} matches).`
            }
        });

        console.log(`[FIXTURE EVENT] Fixtures Generated | Tournament: "${tournament.name}" | Matches: ${fixtures.length}`);

        const matches = await tx.match.findMany({
            where: { tournamentId },
            include: {
                tournament: { select: { name: true } },
                teamA: { select: { name: true, shortName: true } },
                teamB: { select: { name: true, shortName: true } }
            },
            orderBy: { matchDate: "asc" }
        });

        return matches.map((match, index) => ({
            matchNumber: index + 1,
            id: match.id,
            tournamentId: match.tournamentId,
            tournament: match.tournament.name,
            teamA: match.teamA.name,
            teamAShortName: match.teamA.shortName,
            teamB: match.teamB.name,
            teamBShortName: match.teamB.shortName,
            venue: match.venue,
            matchDate: match.matchDate,
            status: match.status
        }));
    }, { maxWait: 15000, timeout: 30000 });
}