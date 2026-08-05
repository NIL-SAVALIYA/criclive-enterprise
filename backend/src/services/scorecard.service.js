
import { getMatchById } from "../repositories/match.repository.js";
import { getLiveInnings } from "../repositories/innings.repository.js";
import { getBattingScorecardsByInnings } from "../repositories/battingScorecard.repository.js";
import { getBowlingScorecardsByInnings, getCurrentBowler } from "../repositories/bowlingScorecard.repository.js";
import { getFallOfWicketsByInnings } from "../repositories/fallOfWicket.repository.js";

export async function getScorecardService(matchId) {

   const match = await getMatchById(matchId);
   const innings = await getLiveInnings(matchId);

   if (!match) {
    throw new Error("Match not found.");
    }

    if (!innings) {
        throw new Error("No live innings found.");
    }

    const battingScorecard = await getBattingScorecardsByInnings(innings.id);

    const bowlingScorecard = await getBowlingScorecardsByInnings(innings.id);

    const fallOfWickets = await getFallOfWicketsByInnings(innings.id);

    const batting = battingScorecard.map(player => ({
        id: player.player.id,
        name: `${player.player.firstName} ${player.player.lastName}`,
        battingPosition: player.battingPosition,
        runs: player.runs,
        balls: player.balls,
        fours: player.fours,
        sixes: player.sixes,
        strikeRate: player.strikeRate,
        isOut: player.isOut,
        dismissalType: player.dismissalType
    }));

    const bowling = bowlingScorecard.map(bowler => ({
        id: bowler.bowler.id,
        name: `${bowler.bowler.firstName} ${bowler.bowler.lastName}`,
        overs: `${bowler.overs}.${bowler.balls}`,
        maidens: bowler.maidens,
        runs: bowler.runs,
        wickets: bowler.wickets,
        economy: bowler.economy,
        wides: bowler.wides,
        noBalls: bowler.noBalls
    }));
    
    const wickets = fallOfWickets.map(wicket => ({
    wicketNumber: wicket.wicketNumber,
    player: `${wicket.player.firstName} ${wicket.player.lastName}`,
    score: wicket.score,
    over: wicket.over,
    wicketType: wicket.wicketType
}));

    return {
        match: {
            id: match.id,
            venue: match.venue,
            matchDate: match.matchDate,
            status: match.status,
            teamA: match.teamA,
            teamB: match.teamB,
            tossWinner: match.tossWinner
        },

        innings: {
            id: innings.id,
            inningsNumber: innings.inningsNumber,
            battingTeam: innings.battingTeam,
            bowlingTeam: innings.bowlingTeam,
            status: innings.status
        },

        batting,

        bowling,

        fallOfWickets: wickets
    };
}