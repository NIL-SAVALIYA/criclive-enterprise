import prisma from "../config/db.js";
import { getMatchById } from "../repositories/match.repository.js";
import { getInningsByMatch } from "../repositories/innings.repository.js";
import { getBattingScorecardsByInnings } from "../repositories/battingScorecard.repository.js";
import { getBowlingScorecardsByInnings } from "../repositories/bowlingScorecard.repository.js";
import { getFallOfWicketsByInnings } from "../repositories/fallOfWicket.repository.js";
import { getPartnershipsByInnings } from "../repositories/partnership.repository.js";
import { resolveBattingStatus, filterDeliveredBowlers } from "../engine/scorecardStatus.engine.js";

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
            allBowlers: [],
            fallOfWickets: [],
            allInnings: []
        };
    }

    const allInningsData = await Promise.all(
        inningsList.map(async (innings) => {
            const [battingScorecard, bowlingScorecard, fallOfWickets, partnerships, balls] = await Promise.all([
                getBattingScorecardsByInnings(innings.id),
                getBowlingScorecardsByInnings(innings.id),
                getFallOfWicketsByInnings(innings.id),
                getPartnershipsByInnings(innings.id),
                prisma.ball.findMany({
                    where: { inningsId: innings.id },
                    select: {
                        batsmanId: true,
                        nonStrikerId: true,
                        bowlerId: true,
                        isLegalDelivery: true,
                        isWicket: true,
                        dismissedPlayerId: true
                    }
                })
            ]);

            const activePartnership = partnerships.find((p) => p.isActive) || null;
            const activeStrikerId = activePartnership?.strikerId || null;
            const activeNonStrikerId = activePartnership?.nonStrikerId || null;

            const participatedPlayerIds = new Set();
            for (const b of balls) {
                if (b.batsmanId) participatedPlayerIds.add(b.batsmanId);
                if (b.nonStrikerId) participatedPlayerIds.add(b.nonStrikerId);
                if (b.dismissedPlayerId) participatedPlayerIds.add(b.dismissedPlayerId);
            }
            for (const p of partnerships) {
                if (p.strikerId) participatedPlayerIds.add(p.strikerId);
                if (p.nonStrikerId) participatedPlayerIds.add(p.nonStrikerId);
            }
            for (const fow of fallOfWickets) {
                if (fow.playerId) participatedPlayerIds.add(fow.playerId);
            }
            for (const bsc of battingScorecard) {
                const pid = bsc.playerId || bsc.id || bsc.player?.id;
                if ((bsc.balls || 0) > 0 || (bsc.runs || 0) > 0 || bsc.isOut) {
                    participatedPlayerIds.add(pid);
                }
            }

            const isInitialLiveInnings = (
                balls.length === 0 &&
                (!activePartnership || (!activeStrikerId && !activeNonStrikerId)) &&
                innings.status === "LIVE"
            );

            const batting = battingScorecard.map((player) => {
                const battingStatus = resolveBattingStatus({
                    player: {
                        ...player,
                        id: player.player?.id || player.playerId || player.id,
                        playerId: player.player?.id || player.playerId || player.id
                    },
                    activeStrikerId,
                    activeNonStrikerId,
                    participatedPlayerIds,
                    isInitialLiveInnings
                });

                return {
                    id: player.player.id,
                    name: `${player.player.firstName} ${player.player.lastName}`,
                    battingPosition: player.battingPosition,
                    runs: player.runs,
                    balls: player.balls,
                    fours: player.fours,
                    sixes: player.sixes,
                    strikeRate: player.strikeRate,
                    isOut: player.isOut,
                    dismissalType: player.dismissalType,
                    status: battingStatus.status,
                    statusText: battingStatus.statusText,
                    hasBatted: battingStatus.hasBatted
                };
            });

            const deliveredBowlers = filterDeliveredBowlers(bowlingScorecard, balls);

            const bowling = deliveredBowlers.map((bowler) => ({
                id: bowler.bowler.id,
                name: `${bowler.bowler.firstName} ${bowler.bowler.lastName}`,
                overs: formatOvers(bowler.balls),
                maidens: bowler.maidens,
                runs: bowler.runs,
                wickets: bowler.wickets,
                economy: bowler.economy,
                wides: bowler.wides || 0,
                noBalls: bowler.noBalls || 0,
                hasDelivered: true
            }));

            const allBowlers = bowlingScorecard.map((bowler) => ({
                id: bowler.bowler.id,
                name: `${bowler.bowler.firstName} ${bowler.bowler.lastName}`,
                overs: formatOvers(bowler.balls),
                maidens: bowler.maidens,
                runs: bowler.runs,
                wickets: bowler.wickets,
                economy: bowler.economy,
                wides: bowler.wides || 0,
                noBalls: bowler.noBalls || 0,
                hasDelivered: (bowler.balls > 0 || (bowler.wides || 0) > 0 || (bowler.noBalls || 0) > 0 || (bowler.runs || 0) > 0 || (bowler.wickets || 0) > 0)
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
                allBowlers,
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
        allBowlers: primary.allBowlers,
        fallOfWickets: primary.fallOfWickets,
        allInnings: allInningsData
    };
}
