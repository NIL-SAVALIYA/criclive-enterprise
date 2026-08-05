import { getDashboardService } from "../services/dashboard.service.js";

export async function getDashboard(req, res, next) {
    try {
        const data = await getDashboardService();

        return res.status(200).json({
            success: true,
            message: "Dashboard fetched successfully.",
            data
        });
    } catch (error) {
        next(error);
    }
}