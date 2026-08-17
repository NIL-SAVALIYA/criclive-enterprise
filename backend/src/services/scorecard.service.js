import { getMatchById } from "../repositories/match.repository.js";
import { getInningsByMatch } from "../repositories/innings.repository.js";
import { getBattingScorecardsByInnings } from "../repositories/battingScorecard.repository.js";
import { getBowlingScorecardsByInnings } from "../repositories/bowlingScorecard.repository.js";
import { getFallOfWicketsByInnings } from "../repositories/fallOfWicket.repository.js";

function formatOvers(balls) {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export async function getScorecardService(matchId) {
    const match = await getMatchById(matchId);

    if (!match) {
        throw new Error("Match not found.");
    }

    const inningsList = await getInningsByMatch(matchId);

    if (!inningsList || inningsList.length === 0) {
        return {
            match: {
                id: match.id,
                venue: match.venue,
                matchDate: match.matchDate,
                status: match.status,
                teamA: match.teamA,
                teamB: match.teamB,
                tossWinner: match.tossWinner,
                winnerTeam: match.winnerTeam,
                result: match.result,
                winningMargin: match.winningMargin
            },
            innings: null,
            batting: [],
            bowling: [],
            fallOfWickets: [],
            allInnings: []
        };
    }

    const allInningsData = await Promise.all(
        inningsList.map(async (innings) => {
            const [battingScorecard, bowlingScorecard, fallOfWickets] = await Promise.all([
                getBattingScorecardsByInnings(innings.id),
                getBowlingScorecardsByInnings(innings.id),
                getFallOfWicketsByInnings(innings.id)
            ]);

            const batting = battingScorecard.map((player) => ({
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

            const bowling = bowlingScorecard.map((bowler) => ({
                id: bowler.bowler.id,
                name: `${bowler.bowler.firstName} ${bowler.bowler.lastName}`,
                overs: formatOvers(bowler.balls),
                maidens: bowler.maidens,
                runs: bowler.runs,
                wickets: bowler.wickets,
                economy: bowler.economy,
                wides: bowler.wides,
                noBalls: bowler.noBalls
            }));

            const wickets = fallOfWickets.map((wicket) => ({
                wicketNumber: wicket.wicketNumber,
                player: `${wicket.player?.firstName || ""} ${wicket.player?.lastName || ""}`.trim(),
                score: wicket.score,
                over: wicket.over,
                wicketType: wicket.wicketType
            }));

            return {
                innings: {
                    id: innings.id,
                    inningsNumber: innings.inningsNumber,
                    battingTeam: innings.battingTeam,
                    bowlingTeam: innings.bowlingTeam,
                    status: innings.status,
                    totalRuns: innings.totalRuns,
                    wickets: innings.wickets,
                    overs: String(innings.overs),
                    legalBalls: innings.legalBalls,
                    currentRunRate: innings.currentRunRate
                },
                batting,
                bowling,
                fallOfWickets: wickets
            };
        })
    );

    // Default to active/live innings, or the latest completed innings
    const activeInningsIndex = allInningsData.findIndex((i) => i.innings.status === "LIVE");
    const primary = activeInningsIndex !== -1
        ? allInningsData[activeInningsIndex]
        : allInningsData[allInningsData.length - 1];

    return {
        match: {
            id: match.id,
            venue: match.venue,
            matchDate: match.matchDate,
            status: match.status,
            teamA: match.teamA,
            teamB: match.teamB,
            tossWinner: match.tossWinner,
            winnerTeam: match.winnerTeam,
            result: match.result,
            winningMargin: match.winningMargin
        },
        innings: primary.innings,
        batting: primary.batting,
        bowling: primary.bowling,
        fallOfWickets: primary.fallOfWickets,
        allInnings: allInningsData
    };
}
