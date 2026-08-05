/*
|--------------------------------------------------------------------------
| ball.service.js
|--------------------------------------------------------------------------
| Ball Scoring Service
|--------------------------------------------------------------------------
*/

import prisma from "../config/db.js";

/* -------------------------------------------------------------------------- */
/*                               Repositories                                 */
/* -------------------------------------------------------------------------- */

import { createBall, 
     updateBall,
    getBallsByInnings,
    getBallById
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

import { ExtraType } from "@prisma/client";


/* -------------------------------------------------------------------------- */
/*                                 Engines                                    */
/* -------------------------------------------------------------------------- */

import { buildBallData } from "../engine/score.engine.js";
import { buildExtrasSummary } from "../engine/extras.engine.js";
import { buildOverSummary,calculateCurrentOverRuns } from "../engine/over.engine.js";
import { buildStrikeSummary } from "../engine/strike.engine.js";
import { buildBattingSummary } from "../engine/batting.engine.js";
import { buildBowlingSummary } from "../engine/bowling.engine.js";
import { buildPartnershipSummary } from "../engine/partnership.engine.js";
import { buildInningsSummary } from "../engine/innings.engine.js";
import { buildWicketSummary } from "../engine/wicket.engine.js";
import { evaluateMatchResult } from "../engine/matchResult.engine.js";

import { calculateOvers } from "../engine/bowling.engine.js";
import { emitLiveScore, emitCommentary, emitScorecardRefresh } from "../socket/socket.server.js";


/* -------------------------------------------------------------------------- */
/*                              Ball Service                                  */
/* -------------------------------------------------------------------------- */

export async function createBallService(data) {

    return prisma.$transaction(async (tx) => {

        /* ------------------------------------------------------------------ */
        /*                           Validate Input                           */
        /* ------------------------------------------------------------------ */

        const {

            inningsId,
            batsmanId,
            nonStrikerId,
            bowlerId,

            batRuns = 0,
            extraRuns = 0,
            extraType = ExtraType.NONE,

            isWicket = false,
            wicketType = null,
            dismissedPlayerId = null,
            newBatsmanId = null,
            fielderId = null,

            commentary = "",
            shotZone = null,
            shotX = null,
            shotY = null,
            pitchLength = null,
            pitchLine = null

        } = data;

        if (!inningsId)
            throw new Error("Innings ID is required.");

        if (!batsmanId)
            throw new Error("Batsman ID is required.");

        if (!nonStrikerId)
            throw new Error("Non-striker ID is required.");

        if (!bowlerId)
            throw new Error("Bowler ID is required.");

        /* ------------------------------------------------------------------ */
        /*                         Load Match State                           */
        /* ------------------------------------------------------------------ */

        const innings =
            await getInningsById(
                inningsId,
                tx
            );

        if (!innings)
            throw new Error("Innings not found.");

        const batting =
            await getBattingScorecardByPlayer(
                innings.id,
                batsmanId,
                tx
            );

        if (!batting)
            throw new Error("Batting scorecard not found.");

        const bowling =
            await getBowlingScorecardByPlayer(
                innings.id,
                bowlerId,
                tx
            );

        if (!bowling)
            throw new Error("Bowling scorecard not found.");

        let partnership =
            await getActivePartnership(
                innings.id,
                tx
            );

        if (!partnership) {

            partnership =
                await createPartnership({

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

            dismissedPlayerId,

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

        console.log("BALL OBJECT");
        console.dir(ball, { depth: null });

        const savedBall = await createBall( ball,tx);

        /* ------------------------------------------------------------------ */
        /*                         Engine Calculations                        */
        /* ------------------------------------------------------------------ */

        const extras = buildExtrasSummary({

            batRuns: ball.batRuns,

            extraRuns: ball.extraRuns,

            extraType: ball.extraType

        });

        const inningsBalls =
        await getBallsByInnings(
            innings.id,
            tx
        );
        const currentOverRuns =
            calculateCurrentOverRuns(
                inningsBalls,
                ball.over
            );
            console.log("currentOverRuns:", currentOverRuns);
            console.log("legalBalls:", innings.legalBalls);
            console.log("ball.over:", ball.over);

        const over = buildOverSummary({

            legalBalls:
                innings.legalBalls +
                (ball.isLegalDelivery ? 1 : 0),

            totalDeliveries:
                innings.totalBalls + 1,

            overRuns:  currentOverRuns

        });

        const strike = buildStrikeSummary({

            strikerId: batsmanId,

            nonStrikerId,

            totalRuns: ball.totalRuns,

            overCompleted: over.completed

        });

        const battingSummary =
            buildBattingSummary({

                runs: batting.runs + ball.batRuns,

                balls:
                    batting.balls +
                    (ball.isLegalDelivery ? 1 : 0),

                fours:
                    batting.fours +
                    (ball.batRuns === 4 ? 1 : 0),

                sixes:
                    batting.sixes +
                    (ball.batRuns === 6 ? 1 : 0),

                isOut: ball.isWicket,

                dismissalType: ball.wicketType,

                bowlerId: bowlerId,

                fielderId: ball.fielderId

            });
        



        const bowlingSummary =
            buildBowlingSummary({

                legalBalls:
                    bowling.balls +
                    (ball.isLegalDelivery ? 1 : 0),

                runs:
                    bowling.runs +
                    ball.totalRuns,

                wickets:
                    bowling.wickets +
                    (
                        ball.isWicket &&
                        ball.wicketType !== "RUN_OUT"
                            ? 1
                            : 0
                    ),

                maidens:
                    bowling.maidens +
                    (
                    over.completed &&
                    over.maiden
                        ? 1
                        : 0
                    ),
 
                wides:
                    bowling.wides +
                    (
                        ball.extraType === "WIDE"
                            ? ball.extraRuns
                            : 0
                    ),

                noBalls:
                    bowling.noBalls +
                    (
                        ball.extraType === "NO_BALL"
                            ? ball.extraRuns
                            : 0
                    )

            });

        const partnershipSummary =
            buildPartnershipSummary({

                runs:
                    partnership.runs +
                    ball.totalRuns,

                legalBalls:
                    partnership.balls +
                    (ball.isLegalDelivery ? 1 : 0),

                fours:
                    partnership.fours +
                    (ball.batRuns === 4 ? 1 : 0),

                sixes:
                    partnership.sixes +
                    (ball.batRuns === 6 ? 1 : 0),

                isActive: !ball.isWicket

            });

        const inningsSummary =
            buildInningsSummary({

                runs:
                    innings.totalRuns +
                    ball.totalRuns,

                wickets:
                    innings.wickets +
                    (ball.isWicket ? 1 : 0),

                legalBalls:
                    innings.legalBalls +
                    (ball.isLegalDelivery ? 1 : 0),

                deliveries:
                    innings.totalBalls + 1,

                target:
                    innings.target,

                maxOvers:
                    innings.maxOvers

            });

        const wicketSummary =
            buildWicketSummary({

                isWicket: ball.isWicket,

                wicketType: ball.wicketType,

                dismissedPlayerId:
                    ball.dismissedPlayerId,

                wicketNumber:
                    innings.wickets + 1,

                teamRuns:
                    innings.totalRuns +
                    ball.totalRuns,

                batsmanRuns:
                    battingSummary.runs,

                over:
                    ball.over,

                ball:
                    ball.ball

            });
        /* ------------------------------------------------------------------ */
        /*                        Update Match State                          */
        /* ------------------------------------------------------------------ */

        await updateBattingScorecard(
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
        );


        await updateBowlingScorecard(
            bowling.id,
            {
                balls: bowlingSummary.balls,
                overs: bowlingSummary.overs,
                runs: bowlingSummary.runs,
                wickets: bowlingSummary.wickets,
                maidens: bowlingSummary.maidens,
                wides: bowlingSummary.wides,
                noBalls: bowlingSummary.noBalls,
                economy: bowlingSummary.economy
            },
            tx
        );

        await updateInnings(
            innings.id,
            {
                totalRuns: inningsSummary.runs,
                wickets: inningsSummary.wickets,
                legalBalls: inningsSummary.legalBalls,
                totalBalls: inningsSummary.deliveries,
                overs: inningsSummary.overs,
                currentRunRate: inningsSummary.runRate
            },
            tx
        );

        await updatePartnership(
            partnership.id,
            {
                runs: partnershipSummary.runs,
                balls: partnershipSummary.balls,
                fours: partnershipSummary.fours,
                sixes: partnershipSummary.sixes,
                isActive: partnershipSummary.isActive
            },
            tx
        );

        /* ------------------------------------------------------------------ */
        /*                         Handle Wicket                              */
        /* ------------------------------------------------------------------ */

        if (ball.isWicket) {

            await createFallOfWicket(
                {
                    inningsId: innings.id,
                    wicketNumber: wicketSummary.fallOfWicket.wicketNumber,
                    playerId: wicketSummary.dismissedPlayerId,
                    score: wicketSummary.fallOfWicket.score,
                    batsmanRuns: wicketSummary.fallOfWicket.batsmanRuns,
                    over: wicketSummary.fallOfWicket.over,
                    ball: wicketSummary.fallOfWicket.ball,
                    wicketType: wicketSummary.wicketType
                },
                tx
            );

            await closePartnership(
                partnership.id,
                tx
            );

            if (dismissedPlayerId && dismissedPlayerId !== nonStrikerId) {

                await createPartnership(
                    {
                        inningsId: innings.id,
                        strikerId: newBatsmanId,
                        nonStrikerId: strike.nonStrikerId,
                        runs: 0,
                        balls: 0,
                        fours: 0,
                        sixes: 0,
                        isActive: true
                    },
                    tx
                );

            } else {

                await createPartnership(
                    {
                        inningsId: innings.id,
                        strikerId: strike.strikerId,
                        nonStrikerId: newBatsmanId,
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

        await evaluateMatchResult( innings.id,tx);

        /* ------------------------------------------------------------------ */
        /*                           Save Ball                                */
        /* ------------------------------------------------------------------ */

        

        /* ------------------------------------------------------------------ */
        /*                           Build Response                           */
        /* ------------------------------------------------------------------ */
        const finalBall = await getBallById(savedBall.id, tx);
        return {

            message: "Ball recorded successfully.",

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

            ball: finalBall

        };

    });

    if (result && result.ball) {
        const matchId = result.ball.innings?.matchId;
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