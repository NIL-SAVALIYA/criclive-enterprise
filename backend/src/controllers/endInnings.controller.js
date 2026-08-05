import { endInnings } from "../services/endInnings.service.js";

export async function endInningsController(req, res) {
    try {
        const { inningsId } = req.params;

        const result = await endInnings(inningsId);

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
}