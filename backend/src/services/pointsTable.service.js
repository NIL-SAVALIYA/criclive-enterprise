import {
    createManyPointsTables,
    getPointsTableByTournament,
    getPointsTableByTeam,
    updatePointsTableByTeam,
    updatePositions
} from "../repositories/pointsTable.repository.js";

import {
    getTournamentById
} from "../repositories/tournament.repository.js";

import {
    getTournamentTeams
} from "../repositories/tournament-team.repository.js";

import {
    buildPointsTableSummary,
    sortStandings,
    assignPositions
} from "../engine/pointsTable.engine.js";

import prisma from "../config/db.js";

export async function initializePointsTableService(tournamentId) {
    return prisma.$transaction(async (tx) => {

        const tournament = await getTournamentById(
            tournamentId,
            tx
        );

        if (!tournament) {
            throw new Error("Tournament not found.");
        }

        const teams = await getTournamentTeams(
            tournamentId,
            tx
        );

        if (!teams.length) {
            throw new Error("No teams found for tournament.");
        }

        const data = teams.map(team => ({
            tournamentId,
            teamId: team.teamId
        }));

        await createManyPointsTables(
            data,
            tx
        );

        return await getPointsTableByTournament(
            tournamentId,
            tx
        );
    });
}

export async function updatePointsTableService(
    tournamentId,
    teamId,
    summary,
    db = prisma
) {
    let record = await getPointsTableByTeam(
        tournamentId,
        teamId,
        db
    );

    if (!record) {
        record = await db.pointsTable.create({
            data: {
                tournamentId,
                teamId,
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
            },
            include: { team: true }
        });
    }

    const updated =
        buildPointsTableSummary({

            team: record.team,

            played:
                record.played + 1,

            won:
                record.won + (summary.won ? 1 : 0),

            lost:
                record.lost + (summary.lost ? 1 : 0),

            tied:
                record.tied + (summary.tied ? 1 : 0),

            noResult:
                record.noResult +
                (summary.noResult ? 1 : 0),

            runsScored:
                record.runsScored +
                summary.runsScored,

            ballsFaced:
                record.ballsFaced +
                summary.ballsFaced,

            runsConceded:
                record.runsConceded +
                summary.runsConceded,

            ballsBowled:
                record.ballsBowled +
                summary.ballsBowled

        });

    await updatePointsTableByTeam(
        tournamentId,
        teamId,
        {
            played: updated.played,
            won: updated.won,
            lost: updated.lost,
            tied: updated.tied,
            noResult: updated.noResult,
            points: updated.points,
            runsScored: updated.runsScored,
            ballsFaced: updated.ballsFaced,
            runsConceded: updated.runsConceded,
            ballsBowled: updated.ballsBowled,
            netRunRate: updated.netRunRate
        },
        db
    );

    const standings =
        await getPointsTableByTournament(
            tournamentId,
            db
        );

    const sorted =
        sortStandings(standings);

    const positioned =
        assignPositions(sorted);

    await updatePositions(
        positioned,
        db
    );

    return positioned;

}

export async function getPointsTableService(tournamentId) {
    const standings =
        await getPointsTableByTournament(
            tournamentId
        );

    const sorted =
        sortStandings(standings);

    return assignPositions(sorted);
}
