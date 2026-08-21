import prisma from "../config/db.js";
import { getLiveScoreService } from "./liveScore.service.js";
import { getScorecardService } from "./scorecard.service.js";
import { getMatchAnalyticsService } from "./analytics.service.js";
import { emitUndoDelivery, emitMatchStateUpdated } from "../socket/socket.server.js";

/**
 * Undo the most recent ball delivery of a match/innings in a single atomic transaction.
 * Restores scores, overs, wickets, striker/non-striker strike state, bowler stats, 
 * batter stats, partnerships, dismissals, wagon wheel, pitch map, and match status.
 */
export async function undoLastBallService({ matchId, inningsId }) {
    // 1. Atomic Database Transaction
    const txResult = await prisma.$transaction(
        async (tx) => {
            let innings;
            if (inningsId) {
                innings = await tx.innings.findUnique({
                    where: { id: inningsId },
                    include: { match: true }
                });
            } else if (matchId) {
                innings = await tx.innings.findFirst({
                    where: { matchId, status: "LIVE" },
                    include: { match: true }
                }) || await tx.innings.findFirst({
                    where: { matchId },
                    orderBy: { inningsNumber: "desc" },
                    include: { match: true }
                });
            }

            if (!innings) {
                const error = new Error("Innings not found for match.");
                error.statusCode = 404;
                throw error;
            }

            // Find the latest delivery of this innings
            const lastBall = await tx.ball.findFirst({
                where: { inningsId: innings.id },
                orderBy: { deliveryNumber: "desc" },
                include: {
                    batsman: true,
                    nonStriker: true,
                    bowler: true,
                    dismissedPlayer: true
                }
            });

            if (!lastBall) {
                const error = new Error("No deliveries found to undo in this innings.");
                error.statusCode = 400;
                throw error;
            }

            const targetMatchId = innings.matchId;

            // 1. Revert Innings Statistics
            const isLegal = lastBall.isLegalDelivery;
            const newLegalBalls = Math.max(0, innings.legalBalls - (isLegal ? 1 : 0));
            const newTotalBalls = Math.max(0, innings.totalBalls - 1);
            const newTotalRuns = Math.max(0, innings.totalRuns - lastBall.totalRuns);
            const newWickets = Math.max(0, innings.wickets - (lastBall.isWicket ? 1 : 0));
            const newOvers = Math.floor(newLegalBalls / 6);
            const newRunRate = newLegalBalls > 0 ? Number(((newTotalRuns * 6) / newLegalBalls).toFixed(2)) : 0;

            await tx.innings.update({
                where: { id: innings.id },
                data: {
                    totalRuns: newTotalRuns,
                    wickets: newWickets,
                    legalBalls: newLegalBalls,
                    totalBalls: newTotalBalls,
                    overs: newOvers,
                    currentRunRate: newRunRate,
                    status: "LIVE"
                }
            });

            // 2. Revert Batting Scorecard for striker
            const battingCard = await tx.battingScorecard.findFirst({
                where: { inningsId: innings.id, playerId: lastBall.batsmanId }
            });

            if (battingCard) {
                const newBatRuns = Math.max(0, battingCard.runs - lastBall.batRuns);
                const newBatBalls = Math.max(0, battingCard.balls - (lastBall.extraType === "WIDE" ? 0 : 1));
                const newFours = Math.max(0, battingCard.fours - (lastBall.isBoundaryFour || lastBall.batRuns === 4 ? 1 : 0));
                const newSixes = Math.max(0, battingCard.sixes - (lastBall.isBoundarySix || lastBall.batRuns === 6 ? 1 : 0));
                const newSR = newBatBalls > 0 ? Number(((newBatRuns * 100) / newBatBalls).toFixed(2)) : 0;

                await tx.battingScorecard.update({
                    where: { id: battingCard.id },
                    data: {
                        runs: newBatRuns,
                        balls: newBatBalls,
                        fours: newFours,
                        sixes: newSixes,
                        strikeRate: newSR
                    }
                });
            }

            // 3. Revert Bowling Scorecard for bowler
            const bowlingCard = await tx.bowlingScorecard.findFirst({
                where: { inningsId: innings.id, bowlerId: lastBall.bowlerId }
            });

            if (bowlingCard) {
                const bowlerConceded = (lastBall.extraType === "BYE" || lastBall.extraType === "LEG_BYE")
                    ? 0
                    : lastBall.totalRuns;
                const newBowlBalls = Math.max(0, bowlingCard.balls - (isLegal ? 1 : 0));
                const newBowlOvers = Math.floor(newBowlBalls / 6);
                const newBowlRuns = Math.max(0, bowlingCard.runs - bowlerConceded);
                const newBowlWickets = Math.max(0, bowlingCard.wickets - (lastBall.isWicket && lastBall.wicketType !== "RUN_OUT" ? 1 : 0));
                const newWides = Math.max(0, (bowlingCard.wides || 0) - (lastBall.extraType === "WIDE" ? (lastBall.extraRuns || 1) : 0));
                const newNoBalls = Math.max(0, (bowlingCard.noBalls || 0) - (lastBall.extraType === "NO_BALL" ? 1 : 0));
                const newEcon = newBowlBalls > 0 ? Number(((newBowlRuns * 6) / newBowlBalls).toFixed(2)) : 0;

                await tx.bowlingScorecard.update({
                    where: { id: bowlingCard.id },
                    data: {
                        balls: newBowlBalls,
                        overs: newBowlOvers,
                        runs: newBowlRuns,
                        wickets: newBowlWickets,
                        wides: newWides,
                        noBalls: newNoBalls,
                        economy: newEcon
                    }
                });
            }

            // 4. Revert Wicket / Dismissal / Fall of Wicket / Partnership State
            if (lastBall.isWicket) {
                const dismissedId = lastBall.dismissedPlayerId || lastBall.batsmanId;

                // Restore dismissed player batting scorecard to NOT OUT
                const dismissedCard = await tx.battingScorecard.findFirst({
                    where: { inningsId: innings.id, playerId: dismissedId }
                });
                if (dismissedCard) {
                    await tx.battingScorecard.update({
                        where: { id: dismissedCard.id },
                        data: {
                            isOut: false,
                            dismissalType: null,
                            bowlerId: null,
                            fielderId: null
                        }
                    });
                }

                // Delete FallOfWicket record for this wicket
                await tx.fallOfWicket.deleteMany({
                    where: {
                        inningsId: innings.id,
                        playerId: dismissedId,
                        wicketNumber: innings.wickets
                    }
                });

                // Delete any partnership that was activated after this wicket
                await tx.partnership.deleteMany({
                    where: { inningsId: innings.id, isActive: true }
                });

                // Re-open and restore previous active partnership with exact striker and non-striker
                const previousPartnership = await tx.partnership.findFirst({
                    where: { inningsId: innings.id },
                    orderBy: { createdAt: "desc" }
                });

                if (previousPartnership) {
                    await tx.partnership.update({
                        where: { id: previousPartnership.id },
                        data: {
                            isActive: true,
                            strikerId: lastBall.batsmanId,
                            nonStrikerId: lastBall.nonStrikerId
                        }
                    });
                } else {
                    await tx.partnership.create({
                        data: {
                            inningsId: innings.id,
                            strikerId: lastBall.batsmanId,
                            nonStrikerId: lastBall.nonStrikerId,
                            runs: 0,
                            balls: 0,
                            fours: 0,
                            sixes: 0,
                            isActive: true
                        }
                    });
                }
            } else {
                // Revert regular partnership stats & restore strike
                const currentPartnership = await tx.partnership.findFirst({
                    where: { inningsId: innings.id, isActive: true }
                });

                if (currentPartnership) {
                    const newPRuns = Math.max(0, currentPartnership.runs - lastBall.totalRuns);
                    const newPBalls = Math.max(0, currentPartnership.balls - (isLegal ? 1 : 0));
                    const newPFours = Math.max(0, currentPartnership.fours - (lastBall.isBoundaryFour || lastBall.batRuns === 4 ? 1 : 0));
                    const newPSixes = Math.max(0, currentPartnership.sixes - (lastBall.isBoundarySix || lastBall.batRuns === 6 ? 1 : 0));

                    await tx.partnership.update({
                        where: { id: currentPartnership.id },
                        data: {
                            runs: newPRuns,
                            balls: newPBalls,
                            fours: newPFours,
                            sixes: newPSixes,
                            strikerId: lastBall.batsmanId,
                            nonStrikerId: lastBall.nonStrikerId
                        }
                    });
                }
            }

            // 5. Delete Ball Record
            await tx.ball.delete({
                where: { id: lastBall.id }
            });

            // 6. Reset Match status if completed
            if (innings.match && innings.match.status === "COMPLETED") {
                await tx.match.update({
                    where: { id: targetMatchId },
                    data: {
                        status: "LIVE",
                        winnerTeamId: null,
                        result: null,
                        winningMargin: null,
                        completedAt: null
                    }
                });
            }

            return {
                undoneBall: lastBall,
                matchId: targetMatchId,
                inningsId: innings.id
            };
        },
        {
            maxWait: 30000,
            timeout: 60000
        }
    );

    // 2. Fetch authoritative updated state after transaction commit
    const resolvedMatchId = txResult.matchId;
    let liveScore = null;
    let scorecard = null;
    let analytics = null;

    try {
        [liveScore, scorecard, analytics] = await Promise.all([
            getLiveScoreService(resolvedMatchId).catch(() => null),
            getScorecardService(resolvedMatchId).catch(() => null),
            getMatchAnalyticsService(resolvedMatchId).catch(() => null)
        ]);
    } catch (fetchErr) {
        console.error("Error fetching match state after undo:", fetchErr);
    }

    const authoritativePayload = {
        matchId: resolvedMatchId,
        inningsId: txResult.inningsId,
        liveScore,
        scorecard,
        analytics,
        undoneBall: txResult.undoneBall
    };

    // 3. Emit Authoritative Socket Events
    try {
        emitUndoDelivery(resolvedMatchId, authoritativePayload);
        emitMatchStateUpdated(resolvedMatchId, authoritativePayload);
    } catch (socketErr) {
        console.error("Socket emission after undo error:", socketErr);
    }

    return {
        success: true,
        message: "Last delivery undone successfully.",
        undoneBall: txResult.undoneBall,
        liveScore,
        scorecard,
        analytics
    };
}
