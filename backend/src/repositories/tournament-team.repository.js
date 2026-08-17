import prisma from "../config/db.js";

/*
|--------------------------------------------------------------------------
| Register Team
|--------------------------------------------------------------------------
*/

export async function registerTeam(data) {

    return prisma.tournamentTeam.create({

        data,

        include: {

            tournament: true,

            team: true

        }

    });

}

/*
|--------------------------------------------------------------------------
| Get All Registered Teams
|--------------------------------------------------------------------------
*/

export async function getAllRegisteredTeams() {

    return prisma.tournamentTeam.findMany({

        include: {

            tournament: true,

            team: true

        }

    });

}

/*
|--------------------------------------------------------------------------
| Get Registration By ID
|--------------------------------------------------------------------------
*/

export async function getRegistrationById(id) {

    return prisma.tournamentTeam.findUnique({

        where: {

            id

        },

        include: {

            tournament: true,

            team: true

        }

    });

}

/*
|--------------------------------------------------------------------------
| Find Registration
|--------------------------------------------------------------------------
*/

export async function findRegistration(tournamentId, teamId) {

    return prisma.tournamentTeam.findFirst({

        where: {

            tournamentId,

            teamId

        }

    });

}

/*
|--------------------------------------------------------------------------
| Delete Registration
|--------------------------------------------------------------------------
*/

export async function deleteRegistration(id) {

    return prisma.tournamentTeam.delete({

        where: {

            id

        }

    });

}

/*
|--------------------------------------------------------------------------
| Get Teams Of Tournament
|--------------------------------------------------------------------------
*/

export async function getTournamentTeams(tournamentId) {
    return prisma.tournamentTeam.findMany({
        where: {
            tournamentId
        },
        include: {
            team: {
                include: {
                    players: true,
                    manager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: "asc"
        }
    });
}

/*
|--------------------------------------------------------------------------
| Get Tournaments Of Team
|--------------------------------------------------------------------------
*/

export async function getTeamTournaments(teamId) {

    return prisma.tournamentTeam.findMany({

        where: {

            teamId

        },

        include: {

            tournament: true

        }

    });

}