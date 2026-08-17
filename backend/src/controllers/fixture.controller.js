import { generateFixturesService } from "../services/fixture.service.js";

/*
|--------------------------------------------------------------------------
| Generate Fixtures
|--------------------------------------------------------------------------
*/

export async function generateFixtures(req, res) {
    try {
        const { tournamentId } = req.params;
        const fixtures = await generateFixturesService(
            tournamentId,
            req.body || {},
            req.user
        );

        return res.status(201).json({
            success: true,
            message: "Fixtures generated successfully.",
            totalMatches: fixtures.length,
            data: fixtures
        });
    } catch (error) {
        const statusCode = error.statusCode || 400;
        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}