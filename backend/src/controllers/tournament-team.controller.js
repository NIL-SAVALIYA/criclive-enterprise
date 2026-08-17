import {
    registerTeamSchema
} from "../validators/tournament-team.validator.js";

import {
    registerTeamService,
    getAllRegisteredTeamsService,
    getRegistrationByIdService,
    deleteRegistrationService,
    getTournamentTeamsService,
    getTeamTournamentsService
} from "../services/tournament-team.service.js";

/*
|--------------------------------------------------------------------------
| Register Team
|--------------------------------------------------------------------------
*/

export async function register(req, res) {
    try {
        const data = registerTeamSchema.parse(req.body);
        const registration = await registerTeamService(data, req.user);

        return res.status(201).json({
            success: true,
            message: "Team registered successfully.",
            data: registration
        });
    } catch (error) {
        const statusCode = error.statusCode || 400;
        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/*
|--------------------------------------------------------------------------
| Get All Registrations
|--------------------------------------------------------------------------
*/

export async function getAll(req, res) {
    try {
        const registrations = await getAllRegisteredTeamsService();

        return res.status(200).json({
            success: true,
            data: registrations
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/*
|--------------------------------------------------------------------------
| Get Registration By ID
|--------------------------------------------------------------------------
*/

export async function getOne(req, res) {
    try {
        const registration = await getRegistrationByIdService(req.params.id);

        return res.status(200).json({
            success: true,
            data: registration
        });
    } catch (error) {
        const statusCode = error.statusCode || 404;
        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/*
|--------------------------------------------------------------------------
| Remove Team From Tournament
|--------------------------------------------------------------------------
*/

export async function remove(req, res) {
    try {
        await deleteRegistrationService(req.params.id, req.user);

        return res.status(200).json({
            success: true,
            message: "Team removed from tournament successfully."
        });
    } catch (error) {
        const statusCode = error.statusCode || 400;
        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/*
|--------------------------------------------------------------------------
| Get Teams Of Tournament
|--------------------------------------------------------------------------
*/

export async function getTournamentTeams(req, res) {

    try {

        const registrations =
            await getTournamentTeamsService(req.params.tournamentId);

        return res.status(200).json({
            success: true,
            totalTeams: registrations.length,
            teams: registrations.map(
                registration => registration.team
            )
        });

    } catch (error) {

        return res.status(404).json({
            success: false,
            message: error.message
        });

    }

}

/*
|--------------------------------------------------------------------------
| Get Tournaments Of Team
|--------------------------------------------------------------------------
*/

export async function getTeamTournaments(req, res) {

    try {

        const tournaments =
            await getTeamTournamentsService(req.params.teamId);

        return res.status(200).json({
            success: true,
            data: tournaments
        });

    } catch (error) {

        return res.status(404).json({
            success: false,
            message: error.message
        });

    }

}