/*
|--------------------------------------------------------------------------
| ball.service.js
|--------------------------------------------------------------------------
| Optimized, Atomic Ball Scoring Service for CRICLIVE Enterprise
|--------------------------------------------------------------------------
*/

import prisma from "../config/db.js";

/* -------------------------------------------------------------------------- */
/*                               Repositories                                 */
/* -------------------------------------------------------------------------- */

import {
    createBall
} from "../repositories/ball.repository.js";

import {
    getInningsById,
    updateInnings
} from "../repositories/innings.repository.js";

import {
    getBattingScorecardByPlayer,
    updateBattingScorecard
} from "../repositories/battingScorecard.repository.js";

import {
    getBowlingScorecardByPlayer,
    updateBowlingScorecard
} from "../repositories/bowlingScorecard.repository.js";

import {
    getActivePartnership,
    createPartnership,
    updatePartnership,
    closePartnership
} from "../repositories/partnership.repository.js";

import {
    createFallOfWicket
} from "../repositories/fallOfWicket.repository.js";


/* -------------------------------------------------------------------------- */
/*                                 Engines                                    */
/* -------------------------------------------------------------------------- */

import { buildBallData } from "../engine/score.engine.js";
import { buildExtrasSummary } from "../engine/extras.engine.js";
import { buildOverSummary } from "../engine/over.engine.js";
import { buildStrikeSummary } from "../engine/strike.engine.js";
import { buildBattingSummary, calculateBalls } from "../engine/batting.engine.js";
import { buildBowlingSummary, calculateOvers } from "../engine/bowling.engine.js";
import { buildPartnershipSummary } from "../engine/partnership.engine.js";
import { buildInningsSummary } from "../engine/innings.engine.js";
import { buildWicketSummary } from "../engine/wicket.engine.js";
import { evaluateMatchResult } from "../engine/matchResult.engine.js";

import { emitLiveScore, emitCommentary, emitScorecardRefresh } from "../socket/socket.server.js";
import { createDeliveryContext } from "../engine/delivery.context.js";

export async function createBallService(data) {

    const deliveryCtx = createDeliveryContext(data);

    const result = await prisma.$transaction(
        async (tx) => {

            const {
                inningsId,
                batsmanId,
                nonStrikerId,
                bowlerId,
                batRuns,
                extraRuns,
                extraType,
                isWicket,
                wicketType,
                dismissedPlayerId,
                newBatsmanId,
                fielderId,
                commentary,
                shotZone,
                shotX,
                shotY,
                pitchLength,
                pitchLine
            } = deliveryCtx;

            /* ------------------------------------------------------------------ */
            /*                         Load Match State                           */
            /* ------------------------------------------------------------------ */

            const [innings, batting, bowling, activePartnership] = await Promise.all([
                getInningsById(inningsId, tx),
                getBattingScorecardByPlayer(inningsId, batsmanId, tx),
                getBowlingScorecardByPlayer(inningsId, bowlerId, tx),
                getActivePartnership(inningsId, tx)
            ]);

            if (!innings) {
                throw new Error("Innings not found.");
            }

            if (innings.status === "COMPLETED") {
                throw new Error("Cannot record ball for a completed innings.");
            }

            if (!batting) {
                throw new Error("Batting scorecard not found for batsman.");
            }

            if (!bowling) {
                throw new Error("Bowling scorecard not found for bowler.");
            }

            let partnership = activePartnership;

            if (!partnership) {
                partnership = await createPartnership({
                    inningsId: innings.id,
                    strikerId: batsmanId,
                    nonStrikerId: nonStrikerId,
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    isActive: true
                }, tx);
            }

            /* ------------------------------------------------------------------ */
            /*                           Build Ball Data                          */
            /* ------------------------------------------------------------------ */

            const ball = buildBallData({
                inningsId: innings.id,
                batsmanId,
                nonStrikerId,
                bowlerId,
                batRuns,
                extraRuns,
                extraType,
                isWicket,
                wicketType,
                dismissedPlayerId: isWicket ? (dismissedPlayerId || batsmanId) : null,
                fielderId,
                commentary,
                shotZone,
                shotX,
                shotY,
                pitchLength,
                pitchLine,
                legalDeliveries: innings.legalBalls,
                totalDeliveries: innings.totalBalls
            });

            /* ------------------------------------------------------------------ */
            /*                         Engine Calculations                        */
            /* ------------------------------------------------------------------ */

            const extras = buildExtrasSummary({
                batRuns: ball.batRuns,
                extraRuns: ball.extraRuns,
                extraType: ball.extraType
            });

            const over = buildOverSummary({
                legalBalls: innings.legalBalls + (ball.isLegalDelivery ? 1 : 0),
                totalDeliveries: innings.totalBalls + 1,
                overRuns: ball.totalRuns
            });

            const strike = buildStrikeSummary({
                strikerId: batsmanId,
                nonStrikerId,
                totalRuns: ball.totalRuns,
                overCompleted: over.completed
            });

            const battingSummary = buildBattingSummary({
                runs: batting.runs + ball.batRuns,
                balls: calculateBalls({
                    currentBalls: batting.balls,
                    isLegalDelivery: ball.isLegalDelivery,
                    extraType: ball.extraType
                }),
                fours: batting.fours + (ball.batRuns === 4 ? 1 : 0),
                sixes: batting.sixes + (ball.batRuns === 6 ? 1 : 0),
                isOut: ball.isWicket,
                dismissalType: ball.wicketType,
                bowlerId: (ball.isWicket && ball.wicketType !== "RUN_OUT") ? bowlerId : null,
                fielderId: ball.fielderId
            });

            // Runs conceded by bowler excludes Byes & Leg Byes
            const bowlerRunsConceded = (ball.extraType === "BYE" || ball.extraType === "LEG_BYE")
                ? 0
                : ball.totalRuns;

            const bowlingSummary = buildBowlingSummary({
                legalBalls: bowling.balls + (ball.isLegalDelivery ? 1 : 0),
                runs: bowling.runs + bowlerRunsConceded,
                wickets: bowling.wickets + (ball.isWicket && ball.wicketType !== "RUN_OUT" ? 1 : 0),
                maidens: bowling.maidens + (over.completed && over.maiden ? 1 : 0),
                wides: bowling.wides + (ball.extraType === "WIDE" ? ball.extraRuns : 0),
                noBalls: bowling.noBalls + (ball.extraType === "NO_BALL" ? ball.extraRuns : 0)
            });

            const partnershipSummary = buildPartnershipSummary({
                runs: partnership.runs + ball.totalRuns,
                legalBalls: partnership.balls + (ball.isLegalDelivery ? 1 : 0),
                fours: partnership.fours + (ball.batRuns === 4 ? 1 : 0),
                sixes: partnership.sixes + (ball.batRuns === 6 ? 1 : 0),
                isActive: !ball.isWicket
            });

            const maxOvers = innings.maxOvers || 20;

            const inningsSummary = buildInningsSummary({
                runs: innings.totalRuns + ball.totalRuns,
                wickets: innings.wickets + (ball.isWicket ? 1 : 0),
                legalBalls: innings.legalBalls + (ball.isLegalDelivery ? 1 : 0),
                deliveries: innings.totalBalls + 1,
                target: innings.target,
                maxOvers
            });

            const wicketSummary = buildWicketSummary({
                isWicket: ball.isWicket,
                wicketType: ball.wicketType,
                dismissedPlayerId: ball.dismissedPlayerId,
                wicketNumber: innings.wickets + 1,
                teamRuns: innings.totalRuns + ball.totalRuns,
                batsmanRuns: battingSummary.runs,
                over: ball.over,
                ball: ball.ball
            });

            /* ------------------------------------------------------------------ */
            /*                        Atomic Writes Execution                     */
            /* ------------------------------------------------------------------ */

            const [savedBall] = await Promise.all([
                createBall(ball, tx),

                updateBattingScorecard(
                    batting.id,
                    {
                        runs: battingSummary.runs,
                        balls: battingSummary.balls,
                        fours: battingSummary.fours,
                        sixes: battingSummary.sixes,
                        strikeRate: battingSummary.strikeRate,
                        isOut: battingSummary.isOut,
                        dismissalType: battingSummary.dismissalType,
                        bowlerId: battingSummary.bowlerId,
                        fielderId: battingSummary.fielderId
                    },
                    tx
                ),

                updateBowlingScorecard(
                    bowling.id,
                    {
                        balls: bowlingSummary.balls,
                        overs: Math.floor(bowlingSummary.balls / 6),
                        runs: bowlingSummary.runs,
                        wickets: bowlingSummary.wickets,
                        maidens: bowlingSummary.maidens,
                        wides: bowlingSummary.wides,
                        noBalls: bowlingSummary.noBalls,
                        economy: bowlingSummary.economy
                    },
                    tx
                ),

                updateInnings(
                    innings.id,
                    {
                        totalRuns: inningsSummary.runs,
                        wickets: inningsSummary.wickets,
                        legalBalls: inningsSummary.legalBalls,
                        totalBalls: inningsSummary.deliveries,
                        overs: Math.floor(inningsSummary.legalBalls / 6),
                        currentRunRate: inningsSummary.runRate
                    },
                    tx
                )
            ]);

            /* ------------------------------------------------------------------ */
            /*                         Handle Partnership / Wicket                */
            /* ------------------------------------------------------------------ */

            if (!ball.isWicket) {
                await updatePartnership(
                    partnership.id,
                    {
                        runs: partnershipSummary.runs,
                        balls: partnershipSummary.balls,
                        fours: partnershipSummary.fours,
                        sixes: partnershipSummary.sixes,
                        isActive: true,
                        strikerId: strike.strikerId,
                        nonStrikerId: strike.nonStrikerId
                    },
                    tx
                );
            } else {
                await createFallOfWicket(
                    {
                        inningsId: innings.id,
                        wicketNumber: wicketSummary.fallOfWicket.wicketNumber,
                        playerId: wicketSummary.dismissedPlayerId,
                        score: wicketSummary.fallOfWicket.score,
                        batsmanRuns: wicketSummary.fallOfWicket.batsmanRuns,
                        over: String(wicketSummary.fallOfWicket.over),
                        ball: wicketSummary.fallOfWicket.ball,
                        wicketType: wicketSummary.wicketType
                    },
                    tx
                );

                await closePartnership(partnership.id, tx);

                // Create next partnership if not all-out
                if (inningsSummary.wickets < 10) {
                    let nextBatterId = newBatsmanId;

                    if (!nextBatterId) {
                        const nextBatterCard = await tx.battingScorecard.findFirst({
                            where: {
                                inningsId: innings.id,
                                isOut: false,
                                playerId: {
                                    notIn: [batsmanId, nonStrikerId]
                                }
                            },
                            orderBy: {
                                battingPosition: "asc"
                            }
                        });
                        nextBatterId = nextBatterCard?.playerId || null;
                    }

                    if (nextBatterId) {
                        const isDismissedStriker = (dismissedPlayerId || batsmanId) === batsmanId;
                        const newStriker = isDismissedStriker ? nextBatterId : strike.strikerId;
                        const newNonStriker = isDismissedStriker ? strike.nonStrikerId : nextBatterId;

                        await createPartnership(
                            {
                                inningsId: innings.id,
                                strikerId: newStriker,
                                nonStrikerId: newNonStriker,
                                runs: 0,
                                balls: 0,
                                fours: 0,
                                sixes: 0,
                                isActive: true
                            },
                            tx
                        );
                    }
                }
            }

            /* ------------------------------------------------------------------ */
            /*                     Innings / Match Completion                     */
            /* ------------------------------------------------------------------ */

            const inningsCompleted =
                inningsSummary.wickets >= 10 ||
                inningsSummary.legalBalls >= maxOvers * 6;

            const targetChased =
                innings.inningsNumber === 2 &&
                inningsSummary.target !== null &&
                inningsSummary.runs >= inningsSummary.target;

            let matchResult = null;
            if (inningsCompleted || targetChased) {
                matchResult = await evaluateMatchResult(innings.id, tx);
            }

            /* ------------------------------------------------------------------ */
            /*                           Build Response                           */
            /* ------------------------------------------------------------------ */

            return {
                message: "Ball recorded successfully.",
                matchResult,
                liveScore: {
                    innings: inningsSummary,
                    batting: battingSummary,
                    bowling: {
                        ...bowlingSummary,
                        overs: calculateOvers(bowlingSummary.balls)
                    },
                    partnership: partnershipSummary,
                    strike,
                    over,
                    extras,
                    wicket: wicketSummary
                },
                ball: savedBall
            };
        },
        {
            maxWait: 15000,
            timeout: 30000
        }
    );

    /* ---------------------------------------------------------------------- */
    /*                 Emit WebSocket Events After Commit                      */
    /* ---------------------------------------------------------------------- */

    if (result && result.ball) {
        const matchId = result.ball.innings?.matchId || result.ball.inningsId;
        if (matchId) {
            emitLiveScore(matchId, result.liveScore);
            emitCommentary(matchId, {
                commentary: result.ball.commentary,
                over: result.ball.over,
                ball: result.ball.ball,
                totalRuns: result.ball.totalRuns,
                isWicket: result.ball.isWicket
            });
            emitScorecardRefresh(matchId, result);
        }
    }

    return result;
}