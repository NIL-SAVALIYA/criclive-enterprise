import { getLiveMatches, getUpcomingMatches,getCompletedMatches} from "../repositories/match.repository.js";
import { toDashboardMatch } from "../mappers/dashboard.mapper.js";

export async function getDashboardService() {

    const liveMatches = await getLiveMatches();

    const upcomingMatches = await getUpcomingMatches();

    const completedMatches = await getCompletedMatches();

return {
    liveMatches: liveMatches.map(toDashboardMatch),

    upcomingMatches: upcomingMatches.map(toDashboardMatch),

    completedMatches: completedMatches.map(toDashboardMatch)
};  
}