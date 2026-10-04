import {
    createInningsSchema,
    updateInningsSchema
} from "../validators/innings.validator.js";

import {
    createInningsService,
    getAllInningsService,
    getInningsByIdService,
    updateInningsService,
    deleteInningsService
} from "../services/innings.service.js";

/*
|--------------------------------------------------------------------------
| Create Innings
|--------------------------------------------------------------------------
*/

export async function create(req, res) {

    try {

        const data = createInningsSchema.parse(req.body);

        const innings = await createInningsService(data);

        return res.status(201).json({

            success: true,

            message: "Innings created successfully.",

            data: innings

        });

    } catch (error) {

        return res.status(400).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Get All Innings
|--------------------------------------------------------------------------
*/

export async function getAll(req, res) {

    try {

        const innings = await getAllInningsService();

        return res.status(200).json({

            success: true,

            data: innings

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Get Innings By ID
|--------------------------------------------------------------------------
*/

export async function getOne(req, res) {

    try {

        const innings = await getInningsByIdService(
            req.params.id
        );

        return res.status(200).json({

            success: true,

            data: innings

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
| Update Innings
|--------------------------------------------------------------------------
*/

export async function update(req, res) {

    try {

        const data = updateInningsSchema.parse(req.body);

        const innings = await updateInningsService(
            req.params.id,
            data
        );

        return res.status(200).json({

            success: true,

            message: "Innings updated successfully.",

            data: innings

        });

    } catch (error) {

        return res.status(400).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Delete Innings
|--------------------------------------------------------------------------
*/

export async function remove(req, res) {

    try {

        await deleteInningsService(req.params.id);

        return res.status(200).json({

            success: true,

            message: "Innings deleted successfully."

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
| Get Eligible Incoming Batters
|--------------------------------------------------------------------------
*/
export async function getEligibleBatters(req, res) {
    try {
        const inningsId = req.params.inningsId || req.params.id;
        const { currentStrikerId, currentNonStrikerId, dismissedPlayerId } = req.query;

        const { getEligibleIncomingBatters } = await import("../services/batterEligibility.service.js");
        const eligible = await getEligibleIncomingBatters({
            inningsId,
            currentStrikerId,
            currentNonStrikerId,
            dismissedPlayerId
        });

        return res.status(200).json({
            success: true,
            data: eligible
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
}