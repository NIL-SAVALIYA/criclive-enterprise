import assert from "node:assert";
import prisma from "../config/db.js";
import { startMatch } from "../services/startMatch.service.js";
import { createBallService } from "../services/ball.service.js";
import { undoLastBallService } from "../services/undoBall.service.js";
import { getScorecardService } from "../services/scorecard.service.js";
import { getMatchAnalyticsService } from "../services/analytics.service.js";
import { getLiveScoreService } from "../services/liveScore.service.js";

async function runE2EScoringFlow() {
    console.log("\n🏏 Running E2E Full Scoring Sequence & Undo Verification...\n");

    let passed = 0;
    let failed = 0;

    async function step(title, fn) {
        try {
            await fn();
            console.log(`  ✅ ${title}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ ${title}:`, err.message);
            failed++;
        }
    }

    const ts = Date.now();
    const tournament = await prisma.tournament.create({
        data: {
            name: `E2E Cup ${ts}`,
            format: "LEAGUE",
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            status: "UPCOMING"
        }
    });

    const teamA = await prisma.team.create({
        data: { name: `Team Alpha E2E ${ts}`, shortName: `TA${ts.toString().slice(-4)}`, city: "London" }
    });

    const teamB = await prisma.team.create({
        data: { name: `Team Beta E2E ${ts}`, shortName: `TB${ts.toString().slice(-4)}`, city: "Sydney" }
    });

    const playersA = [];
    for (let i = 1; i <= 11; i++) {
        const p = await prisma.player.create({
            data: {
                firstName: `Batter${i}`,
                lastName: `Alpha`,
                teamId: teamA.id,
                playerType: i <= 5 ? "BATSMAN" : i <= 7 ? "ALL_ROUNDER" : "BOWLER",
                jerseyNumber: i
            }
        });
        playersA.push(p);
    }

    const playersB = [];
    for (let i = 1; i <= 11; i++) {
        const p = await prisma.player.create({
            data: {
                firstName: `Bowler${i}`,
                lastName: `Beta`,
                teamId: teamB.id,
                playerType: i <= 5 ? "BATSMAN" : i <= 7 ? "ALL_ROUNDER" : "BOWLER",
                jerseyNumber: i
            }
        });
        playersB.push(p);
    }

    const match = await prisma.match.create({
        data: {
            tournamentId: tournament.id,
            teamAId: teamA.id,
            teamBId: teamB.id,
            matchDate: new Date(),
            venue: "MCG",
            status: "UPCOMING",
            tossWinnerId: teamA.id,
            tossDecision: "BAT"
        }
    });

    await prisma.playingXI.createMany({
        data: [
            ...playersA.map((p, idx) => ({
                matchId: match.id,
                teamId: teamA.id,
                playerId: p.id,
                battingOrder: idx + 1,
                isCaptain: idx === 0,
                isWicketKeeper: idx === 1
            })),
            ...playersB.map((p, idx) => ({
                matchId: match.id,
                teamId: teamB.id,
                playerId: p.id,
                battingOrder: idx + 1,
                isCaptain: idx === 0,
                isWicketKeeper: idx === 1
            }))
        ]
    });

    await startMatch(
        match.id,
        playersA[0].id, // Striker (Batter1)
        playersA[1].id, // Non-Striker (Batter2)
        playersB[10].id, // Bowler (Bowler11)
        null
    );

    const innings = await prisma.innings.findFirst({
        where: { matchId: match.id, status: "LIVE" }
    });

    // Delivery 1: 1 run to Long On
    await step("Delivery 1: 1 run -> Striker swaps to Batter2, Score 1/0 (0.1 ov)", async () => {
        await createBallService({
            inningsId: innings.id,
            batsmanId: playersA[0].id,
            nonStrikerId: playersA[1].id,
            bowlerId: playersB[10].id,
            batRuns: 1,
            extraRuns: 0,
            extraType: "NONE",
            shotZone: "Long On",
            shotX: 120,
            shotY: 60,
            pitchLength: "Good",
            pitchLine: "Stumps"
        });

        const live = await getLiveScoreService(match.id);
        assert.strictEqual(live.score.runs, 1);
        assert.strictEqual(live.score.wickets, 0);
        assert.strictEqual(live.score.legalBalls, 1);
        assert.strictEqual(live.currentBatters.striker.id, playersA[1].id, "Striker is now Batter2");
        assert.strictEqual(live.currentBatters.nonStriker.id, playersA[0].id, "Non-Striker is Batter1");
    });

    // Delivery 2: 4 runs (boundary) to Cover
    await step("Delivery 2: 4 runs -> Striker remains Batter2, Score 5/0 (0.2 ov)", async () => {
        await createBallService({
            inningsId: innings.id,
            batsmanId: playersA[1].id,
            nonStrikerId: playersA[0].id,
            bowlerId: playersB[10].id,
            batRuns: 4,
            extraRuns: 0,
            extraType: "NONE",
            shotZone: "Cover",
            shotX: -100,
            shotY: 50,
            pitchLength: "Full",
            pitchLine: "Off"
        });

        const live = await getLiveScoreService(match.id);
        assert.strictEqual(live.score.runs, 5);
        assert.strictEqual(live.score.legalBalls, 2);
        assert.strictEqual(live.currentBatters.striker.id, playersA[1].id, "4 runs boundary keeps Batter2 on strike");
    });

    // Delivery 3: 6 runs (boundary) to Mid Wicket
    await step("Delivery 3: 6 runs -> Striker remains Batter2, Score 11/0 (0.3 ov)", async () => {
        await createBallService({
            inningsId: innings.id,
            batsmanId: playersA[1].id,
            nonStrikerId: playersA[0].id,
            bowlerId: playersB[10].id,
            batRuns: 6,
            extraRuns: 0,
            extraType: "NONE",
            shotZone: "Mid Wicket",
            shotX: 110,
            shotY: 55,
            pitchLength: "Full",
            pitchLine: "Stumps"
        });

        const live = await getLiveScoreService(match.id);
        assert.strictEqual(live.score.runs, 11);
        assert.strictEqual(live.score.legalBalls, 3);
        assert.strictEqual(live.currentBatters.striker.id, playersA[1].id, "6 runs boundary keeps Batter2 on strike");
    });

    // Delivery 4: 2 runs to Square Leg
    await step("Delivery 4: 2 runs -> Striker remains Batter2, Score 13/0 (0.4 ov)", async () => {
        await createBallService({
            inningsId: innings.id,
            batsmanId: playersA[1].id,
            nonStrikerId: playersA[0].id,
            bowlerId: playersB[10].id,
            batRuns: 2,
            extraRuns: 0,
            extraType: "NONE",
            shotZone: "Square Leg",
            shotX: 80,
            shotY: -40,
            pitchLength: "Short",
            pitchLine: "Stumps"
        });

        const live = await getLiveScoreService(match.id);
        assert.strictEqual(live.score.runs, 13);
        assert.strictEqual(live.score.legalBalls, 4);
        assert.strictEqual(live.currentBatters.striker.id, playersA[1].id, "2 runs keeps Batter2 on strike");
    });

    // Delivery 5: 3 runs to Point
    await step("Delivery 5: 3 runs -> Striker swaps to Batter1, Score 16/0 (0.5 ov)", async () => {
        await createBallService({
            inningsId: innings.id,
            batsmanId: playersA[1].id,
            nonStrikerId: playersA[0].id,
            bowlerId: playersB[10].id,
            batRuns: 3,
            extraRuns: 0,
            extraType: "NONE",
            shotZone: "Point",
            shotX: -90,
            shotY: -40,
            pitchLength: "Good",
            pitchLine: "Off"
        });

        const live = await getLiveScoreService(match.id);
        assert.strictEqual(live.score.runs, 16);
        assert.strictEqual(live.score.legalBalls, 5);
        assert.strictEqual(live.currentBatters.striker.id, playersA[0].id, "3 runs swaps strike to Batter1");
    });

    // Delivery 6: WIDE (+1 extra run)
    await step("Delivery 6: Wide -> Legal balls remain 5, Score 17/0", async () => {
        await createBallService({
            inningsId: innings.id,
            batsmanId: playersA[0].id,
            nonStrikerId: playersA[1].id,
            bowlerId: playersB[10].id,
            batRuns: 0,
            extraRuns: 1,
            extraType: "WIDE",
            pitchLength: "Good",
            pitchLine: "Wide"
        });

        const live = await getLiveScoreService(match.id);
        assert.strictEqual(live.score.runs, 17);
        assert.strictEqual(live.score.legalBalls, 5, "Wide is not a legal ball");
        assert.strictEqual(live.currentBatters.striker.id, playersA[0].id, "Wide does not swap strike");
    });

    // Delivery 7: NO BALL (+1 extra run)
    await step("Delivery 7: No Ball -> Free Hit next, Legal balls remain 5, Score 18/0", async () => {
        await createBallService({
            inningsId: innings.id,
            batsmanId: playersA[0].id,
            nonStrikerId: playersA[1].id,
            bowlerId: playersB[10].id,
            batRuns: 0,
            extraRuns: 1,
            extraType: "NO_BALL",
            pitchLength: "Full",
            pitchLine: "Off"
        });

        const live = await getLiveScoreService(match.id);
        assert.strictEqual(live.score.runs, 18);
        assert.strictEqual(live.score.legalBalls, 5, "No ball is not a legal ball");
    });

    // Delivery 8: WICKET (BOWLED) -> Incoming Batter3
    await step("Delivery 8: Wicket (Bowled) -> Over completed (1.0 ov), Score 18/1", async () => {
        await createBallService({
            inningsId: innings.id,
            batsmanId: playersA[0].id,
            nonStrikerId: playersA[1].id,
            bowlerId: playersB[10].id,
            batRuns: 0,
            extraRuns: 0,
            extraType: "NONE",
            isWicket: true,
            wicketType: "BOWLED",
            dismissedPlayerId: playersA[0].id,
            newBatsmanId: playersA[2].id, // Batter3
            shotZone: "Point",
            pitchLength: "Yorker",
            pitchLine: "Stumps"
        });

        const live = await getLiveScoreService(match.id);
        assert.strictEqual(live.score.runs, 18);
        assert.strictEqual(live.score.wickets, 1);
        assert.strictEqual(live.score.legalBalls, 6, "Over 1.0 completed");

        const card = await getScorecardService(match.id);
        const dismissedCard = card.batting.find(b => (b.id || b.playerId) === playersA[0].id);
        assert.strictEqual(dismissedCard.isOut, true, "Batter1 is OUT");

        const analytics = await getMatchAnalyticsService(match.id);
        assert.ok(analytics.wagonWheel);
        assert.ok(analytics.pitchMap);
    });

    // UNDO: Revert the Wicket delivery!
    await step("UNDO Delivery 8: Wicket reverted -> Batter1 restored to NOT OUT, Score returns to 18/0 (0.5 ov)", async () => {
        const undoRes = await undoLastBallService({ matchId: match.id });
        assert.strictEqual(undoRes.success, true);

        const live = await getLiveScoreService(match.id);
        assert.strictEqual(live.score.runs, 18);
        assert.strictEqual(live.score.wickets, 0, "Wickets reverted to 0");
        assert.strictEqual(live.score.legalBalls, 5, "Legal balls reverted to 5");

        const card = await getScorecardService(match.id);
        const restoredCard = card.batting.find(b => (b.id || b.playerId) === playersA[0].id);
        assert.strictEqual(restoredCard.isOut, false, "Batter1 is restored to NOT OUT");
        assert.strictEqual(card.fallOfWickets.length, 0, "Fall of wickets reverted to 0");

        // Verify active partnership is back with original pair (Batter1 & Batter2)
        const activePart = await prisma.partnership.findFirst({
            where: { inningsId: innings.id, isActive: true }
        });
        assert.ok(activePart);
        assert.strictEqual(activePart.strikerId, playersA[0].id);
        assert.strictEqual(activePart.nonStrikerId, playersA[1].id);
    });

    // Cleanup
    await prisma.ball.deleteMany({ where: { inningsId: innings.id } });
    await prisma.fallOfWicket.deleteMany({ where: { inningsId: innings.id } });
    await prisma.partnership.deleteMany({ where: { inningsId: innings.id } });
    await prisma.battingScorecard.deleteMany({ where: { inningsId: innings.id } });
    await prisma.bowlingScorecard.deleteMany({ where: { inningsId: innings.id } });
    await prisma.innings.deleteMany({ where: { matchId: match.id } });
    await prisma.playingXI.deleteMany({ where: { matchId: match.id } });
    await prisma.match.deleteMany({ where: { id: match.id } });
    await prisma.player.deleteMany({ where: { teamId: { in: [teamA.id, teamB.id] } } });
    await prisma.team.deleteMany({ where: { id: { in: [teamA.id, teamB.id] } } });
    await prisma.tournament.deleteMany({ where: { id: tournament.id } });

    console.log(`\n======================================================`);
    console.log(`E2E FLOW RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log(`======================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runE2EScoringFlow().catch((err) => {
    console.error("E2E Test fatal error:", err);
    process.exit(1);
});
