import assert from "node:assert";
import prisma from "../config/db.js";
import { startMatch } from "../services/startMatch.service.js";
import { createBallService } from "../services/ball.service.js";
import { undoLastBallService } from "../services/undoBall.service.js";
import { getScorecardService } from "../services/scorecard.service.js";
import { getLiveScoreService } from "../services/liveScore.service.js";
import { buildWagonWheelData } from "../engine/analytics.engine.js";
import { shouldRotateStrike } from "../engine/strike.engine.js";

async function runWagonWheelAndByesTests() {
    console.log("\n🧪 Running Comprehensive Wagon Wheel (8 Zones), Bye/Leg-Bye & Undo Test Suite...\n");

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`  ✅ ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ ${name}:`, err.message);
            failed++;
        }
    }

    const ts = Date.now();
    const tournament = await prisma.tournament.create({
        data: {
            name: `Wagon & Byes Cup ${ts}`,
            format: "LEAGUE",
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            status: "UPCOMING"
        }
    });

    const teamA = await prisma.team.create({
        data: { name: `Team Alpha WW ${ts}`, shortName: `TA${ts.toString().slice(-4)}`, city: "Zone A" }
    });

    const teamB = await prisma.team.create({
        data: { name: `Team Beta WW ${ts}`, shortName: `TB${ts.toString().slice(-4)}`, city: "Zone B" }
    });

    const playersA = [];
    for (let i = 1; i <= 11; i++) {
        const p = await prisma.player.create({
            data: {
                firstName: `Bat${i}`,
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
                firstName: `Bowl${i}`,
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
            venue: "Wankhede Stadium",
            status: "UPCOMING",
            tossWinnerId: teamA.id,
            tossDecision: "BAT"
        }
    });

    for (let i = 0; i < 11; i++) {
        await prisma.playingXI.create({
            data: {
                matchId: match.id,
                teamId: teamA.id,
                playerId: playersA[i].id,
                battingOrder: i + 1,
                isCaptain: i === 0,
                isWicketKeeper: i === 1
            }
        });
        await prisma.playingXI.create({
            data: {
                matchId: match.id,
                teamId: teamB.id,
                playerId: playersB[i].id,
                battingOrder: i + 1,
                isCaptain: i === 0,
                isWicketKeeper: i === 1
            }
        });
    }

    await startMatch(
        match.id,
        playersA[0].id,
        playersA[1].id,
        playersB[10].id,
        null
    );

    const innings = await prisma.innings.findFirst({
        where: { matchId: match.id, status: "LIVE" }
    });

    function getEligibleBowler(legalBalls, currentBowlingId) {
        if (legalBalls > 0 && legalBalls % 6 === 0) {
            // Must alternate bowler at start of new over
            return currentBowlingId === playersB[10].id ? playersB[9].id : playersB[10].id;
        }
        return currentBowlingId || playersB[10].id;
    }

    // -------------------------------------------------------------
    // SECTION 1: WAGON WHEEL 8 CANONICAL ZONES TESTS
    // -------------------------------------------------------------
    console.log("\n--- 1. Wagon Wheel 8 Canonical Zones Persistence & Aggregation ---");

    const canonicalZones = [
        { zone: "Fine Leg", x: 55, y: -95, runs: 1 },
        { zone: "Square Leg", x: 95, y: -40, runs: 2 },
        { zone: "Mid Wicket", x: 95, y: 45, runs: 6 },
        { zone: "Long On", x: 50, y: 95, runs: 4 },
        { zone: "Long Off", x: -50, y: 95, runs: 1 },
        { zone: "Cover", x: -95, y: 45, runs: 4 },
        { zone: "Point", x: -95, y: -40, runs: 3 },
        { zone: "Third Man", x: -55, y: -95, runs: 2 }
    ];

    for (const z of canonicalZones) {
        await test(`Records delivery to ${z.zone} (x: ${z.x}, y: ${z.y}) with ${z.runs} runs`, async () => {
            const liveBefore = await getLiveScoreService(match.id);
            const striker = liveBefore.currentBatters.striker.id;
            const nonStriker = liveBefore.currentBatters.nonStriker.id;
            const bowler = getEligibleBowler(liveBefore.score.legalBalls, liveBefore.currentBowling?.id);

            const res = await createBallService({
                inningsId: innings.id,
                batsmanId: striker,
                nonStrikerId: nonStriker,
                bowlerId: bowler,
                batRuns: z.runs,
                extraRuns: 0,
                extraType: "NONE",
                shotZone: z.zone,
                shotX: z.x,
                shotY: z.y,
                pitchLength: "Good",
                pitchLine: "Stumps"
            });

            assert.strictEqual(res.ball.shotZone, z.zone);
            assert.strictEqual(res.ball.shotX, z.x);
            assert.strictEqual(res.ball.shotY, z.y);
        });
    }

    await test("Wagon Wheel Analytics engine correctly sums runs and boundaries for all 8 zones", async () => {
        const balls = await prisma.ball.findMany({ where: { inningsId: innings.id } });
        const wagon = buildWagonWheelData(balls);

        assert.strictEqual(wagon.zoneSummary.length, 8);
        const midWicket = wagon.zoneSummary.find(z => z.zone === "Mid Wicket");
        assert.strictEqual(midWicket.runs, 6);
        assert.strictEqual(midWicket.sixes, 1);

        const longOn = wagon.zoneSummary.find(z => z.zone === "Long On");
        assert.strictEqual(longOn.runs, 4);
        assert.strictEqual(longOn.fours, 1);

        const cover = wagon.zoneSummary.find(z => z.zone === "Cover");
        assert.strictEqual(cover.runs, 4);
        assert.strictEqual(cover.fours, 1);
    });

    // -------------------------------------------------------------
    // SECTION 2: BYE SCORING (1B to 6B)
    // -------------------------------------------------------------
    console.log("\n--- 2. Bye Runs Engine & Scoring Tests (1B - 6B) ---");

    const byeRunsTests = [
        { runs: 1, shouldSwap: true },
        { runs: 2, shouldSwap: false },
        { runs: 3, shouldSwap: true },
        { runs: 4, shouldSwap: false },
        { runs: 5, shouldSwap: true },
        { runs: 6, shouldSwap: false }
    ];

    for (const bCase of byeRunsTests) {
        await test(`Physical runs engine test for ${bCase.runs}B: shouldRotateStrike = ${bCase.shouldSwap}`, async () => {
            const rotates = shouldRotateStrike({ batRuns: 0, extraRuns: bCase.runs, extraType: "BYE" });
            assert.strictEqual(rotates, bCase.shouldSwap);
        });

        await test(`Records ${bCase.runs} Bye runs -> Team +${bCase.runs}, Batter +0 runs, Bowler +0 runs`, async () => {
            const liveBefore = await getLiveScoreService(match.id);
            const runsBefore = liveBefore.score.runs;
            const legalBallsBefore = liveBefore.score.legalBalls;
            const currentStrikerId = liveBefore.currentBatters.striker.id;
            const currentNonStrikerId = liveBefore.currentBatters.nonStriker.id;
            const bowlerId = getEligibleBowler(legalBallsBefore, liveBefore.currentBowling?.id);

            const cardBefore = await getScorecardService(match.id);
            const strikerCardBefore = cardBefore.batting.find(b => (b.id || b.playerId) === currentStrikerId);
            const bowlerCardBefore = cardBefore.bowling.find(b => (b.id || b.bowlerId) === bowlerId) || { runs: 0, overs: "0.0" };

            await createBallService({
                inningsId: innings.id,
                batsmanId: currentStrikerId,
                nonStrikerId: currentNonStrikerId,
                bowlerId: bowlerId,
                batRuns: 0,
                extraRuns: bCase.runs,
                extraType: "BYE",
                shotZone: "Third Man",
                shotX: -55,
                shotY: -95,
                pitchLength: "Good",
                pitchLine: "Off"
            });

            const liveAfter = await getLiveScoreService(match.id);
            assert.strictEqual(liveAfter.score.runs, runsBefore + bCase.runs, `Team runs increase by ${bCase.runs}`);
            assert.strictEqual(liveAfter.score.legalBalls, legalBallsBefore + 1, "Legal balls increment by 1");

            const cardAfter = await getScorecardService(match.id);
            const strikerCardAfter = cardAfter.batting.find(b => (b.id || b.playerId) === currentStrikerId);
            const bowlerCardAfter = cardAfter.bowling.find(b => (b.id || b.bowlerId) === bowlerId);

            assert.strictEqual(strikerCardAfter.runs, strikerCardBefore.runs, "Batter runs do NOT increase on bye");
            assert.strictEqual(bowlerCardAfter.runs, bowlerCardBefore.runs, "Bowler conceded runs do NOT increase on bye");

            // Strike rotation check (accounting for over end if legalBalls % 6 === 0)
            const isOverEnd = (legalBallsBefore + 1) % 6 === 0;
            const expectedStriker = isOverEnd
                ? (bCase.shouldSwap ? currentStrikerId : currentNonStrikerId)
                : (bCase.shouldSwap ? currentNonStrikerId : currentStrikerId);

            assert.strictEqual(liveAfter.currentBatters.striker.id, expectedStriker, "Striker position matches physical runs & over end");

            // UNDO THIS BYE DELIVERY TO TEST UNDO REVERSAL!
            const undoRes = await undoLastBallService({ matchId: match.id });
            assert.strictEqual(undoRes.success, true);

            const liveAfterUndo = await getLiveScoreService(match.id);
            assert.strictEqual(liveAfterUndo.score.runs, runsBefore, "Team score reverted after undo");
            assert.strictEqual(liveAfterUndo.score.legalBalls, legalBallsBefore, "Legal balls reverted after undo");
            assert.strictEqual(liveAfterUndo.currentBatters.striker.id, currentStrikerId, "Striker reverted after undo");
        });
    }

    // -------------------------------------------------------------
    // SECTION 3: LEG BYE SCORING (1LB to 6LB)
    // -------------------------------------------------------------
    console.log("\n--- 3. Leg Bye Runs Engine & Scoring Tests (1LB - 6LB) ---");

    const legByeRunsTests = [
        { runs: 1, shouldSwap: true },
        { runs: 2, shouldSwap: false },
        { runs: 3, shouldSwap: true },
        { runs: 4, shouldSwap: false },
        { runs: 5, shouldSwap: true },
        { runs: 6, shouldSwap: false }
    ];

    for (const lbCase of legByeRunsTests) {
        await test(`Records ${lbCase.runs} Leg Bye runs -> Team +${lbCase.runs}, Batter +0 runs, Bowler +0 runs`, async () => {
            const liveBefore = await getLiveScoreService(match.id);
            const runsBefore = liveBefore.score.runs;
            const legalBallsBefore = liveBefore.score.legalBalls;
            const currentStrikerId = liveBefore.currentBatters.striker.id;
            const currentNonStrikerId = liveBefore.currentBatters.nonStriker.id;
            const bowlerId = getEligibleBowler(legalBallsBefore, liveBefore.currentBowling?.id);

            await createBallService({
                inningsId: innings.id,
                batsmanId: currentStrikerId,
                nonStrikerId: currentNonStrikerId,
                bowlerId: bowlerId,
                batRuns: 0,
                extraRuns: lbCase.runs,
                extraType: "LEG_BYE",
                shotZone: "Fine Leg",
                shotX: 55,
                shotY: -95,
                pitchLength: "Full",
                pitchLine: "Stumps"
            });

            const liveAfter = await getLiveScoreService(match.id);
            assert.strictEqual(liveAfter.score.runs, runsBefore + lbCase.runs, `Team runs increase by ${lbCase.runs}`);
            assert.strictEqual(liveAfter.score.legalBalls, legalBallsBefore + 1, "Legal balls increment by 1");

            // UNDO THIS LEG BYE DELIVERY TO TEST UNDO REVERSAL!
            const undoRes = await undoLastBallService({ matchId: match.id });
            assert.strictEqual(undoRes.success, true);

            const liveAfterUndo = await getLiveScoreService(match.id);
            assert.strictEqual(liveAfterUndo.score.runs, runsBefore, "Team score reverted after undo");
            assert.strictEqual(liveAfterUndo.score.legalBalls, legalBallsBefore, "Legal balls reverted after undo");
        });
    }

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
    console.log(`WAGON WHEEL & BYES TEST SUITE: ${passed} Passed, ${failed} Failed`);
    console.log(`======================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runWagonWheelAndByesTests().catch((err) => {
    console.error("Test runner fatal error:", err);
    process.exit(1);
});
