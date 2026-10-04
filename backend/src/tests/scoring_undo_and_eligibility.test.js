import assert from "node:assert";
import prisma from "../config/db.js";
import { startMatch } from "../services/startMatch.service.js";
import { createBallService } from "../services/ball.service.js";
import { undoLastBallService } from "../services/undoBall.service.js";
import { getEligibleIncomingBatters, validateIncomingBatter } from "../services/batterEligibility.service.js";
import { buildWagonWheelData, buildPitchMapData } from "../engine/analytics.engine.js";

async function runTests() {
    console.log("\n🧪 Running Comprehensive Scoring, Wicket Eligibility, Analytics & Undo Test Suite...\n");

    let passed = 0;
    let failed = 0;

    async function asyncTest(name, fn) {
        try {
            await fn();
            console.log(`  ✅ ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ ${name}:`, err.message);
            failed++;
        }
    }

    let testTournament;
    let testTeamA;
    let testTeamB;
    let testMatch;
    let testInnings;
    let playersA = [];
    let playersB = [];

    await asyncTest("1. Setup fresh match fixture with Playing XI", async () => {
        const ts = Date.now();
        testTournament = await prisma.tournament.create({
            data: {
                name: `Eligibility Cup ${ts}`,
                format: "LEAGUE",
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                status: "UPCOMING"
            }
        });

        testTeamA = await prisma.team.create({
            data: { name: `Team Alpha ${ts}`, shortName: `TA${ts.toString().slice(-4)}`, city: "City A" }
        });

        testTeamB = await prisma.team.create({
            data: { name: `Team Beta ${ts}`, shortName: `TB${ts.toString().slice(-4)}`, city: "City B" }
        });

        // 11 players for Team A
        for (let i = 1; i <= 11; i++) {
            const p = await prisma.player.create({
                data: {
                    firstName: `BatAlpha${i}`,
                    lastName: `${ts}`,
                    teamId: testTeamA.id,
                    playerType: i <= 5 ? "BATSMAN" : i <= 7 ? "ALL_ROUNDER" : "BOWLER",
                    jerseyNumber: i
                }
            });
            playersA.push(p);
        }

        // 11 players for Team B
        for (let i = 1; i <= 11; i++) {
            const p = await prisma.player.create({
                data: {
                    firstName: `BowlBeta${i}`,
                    lastName: `${ts}`,
                    teamId: testTeamB.id,
                    playerType: i <= 5 ? "BATSMAN" : i <= 7 ? "ALL_ROUNDER" : "BOWLER",
                    jerseyNumber: i
                }
            });
            playersB.push(p);
        }

        testMatch = await prisma.match.create({
            data: {
                tournamentId: testTournament.id,
                teamAId: testTeamA.id,
                teamBId: testTeamB.id,
                matchDate: new Date(),
                venue: "Lord's Cricket Ground",
                status: "UPCOMING",
                tossWinnerId: testTeamA.id,
                tossDecision: "BAT"
            }
        });

        // Playing XI
        await prisma.playingXI.createMany({
            data: [
                ...playersA.map((p, idx) => ({
                    matchId: testMatch.id,
                    teamId: testTeamA.id,
                    playerId: p.id,
                    battingOrder: idx + 1,
                    isCaptain: idx === 0,
                    isWicketKeeper: idx === 1
                })),
                ...playersB.map((p, idx) => ({
                    matchId: testMatch.id,
                    teamId: testTeamB.id,
                    playerId: p.id,
                    battingOrder: idx + 1,
                    isCaptain: idx === 0,
                    isWicketKeeper: idx === 1
                }))
            ]
        });

        // Start Match
        await startMatch(
            testMatch.id,
            playersA[0].id,
            playersA[1].id,
            playersB[10].id,
            null
        );

        testInnings = await prisma.innings.findFirst({
            where: { matchId: testMatch.id, status: "LIVE" }
        });

        assert.ok(testInnings, "Innings should be LIVE");
    });

    // -------------------------------------------------------------
    // SECTION 1: INCOMING BATTER ELIGIBILITY RULES
    // -------------------------------------------------------------
    console.log("\n--- 1. Incoming Batter Eligibility Unit & Service Tests ---");

    await asyncTest("getEligibleIncomingBatters returns only eligible batting team members", async () => {
        const eligible = await getEligibleIncomingBatters({
            inningsId: testInnings.id,
            currentStrikerId: playersA[0].id,
            currentNonStrikerId: playersA[1].id
        });

        // 11 in XI - 2 active = 9 eligible
        assert.strictEqual(eligible.length, 9);
        for (const batter of eligible) {
            assert.notStrictEqual(batter.playerId, playersA[0].id);
            assert.notStrictEqual(batter.playerId, playersA[1].id);
            assert.strictEqual(batter.isOut, false);
        }
    });

    await asyncTest("Rejects incoming batter from OPPOSITION team (HTTP 400)", async () => {
        let errCaught = false;
        try {
            await validateIncomingBatter({
                inningsId: testInnings.id,
                newBatsmanId: playersB[0].id, // Opposition player
                currentStrikerId: playersA[0].id,
                currentNonStrikerId: playersA[1].id
            });
        } catch (err) {
            errCaught = true;
            assert.ok(err.message.includes("batting team") || err.message.includes("Opposition"));
        }
        assert.strictEqual(errCaught, true, "Must reject opposition player");
    });

    await asyncTest("Rejects incoming batter who is the ACTIVE STRIKER (HTTP 400)", async () => {
        let errCaught = false;
        try {
            await validateIncomingBatter({
                inningsId: testInnings.id,
                newBatsmanId: playersA[0].id, // Active striker
                currentStrikerId: playersA[0].id,
                currentNonStrikerId: playersA[1].id
            });
        } catch (err) {
            errCaught = true;
            assert.ok(err.message.includes("active striker"));
        }
        assert.strictEqual(errCaught, true, "Must reject active striker");
    });

    await asyncTest("Rejects incoming batter who is the ACTIVE NON-STRIKER (HTTP 400)", async () => {
        let errCaught = false;
        try {
            await validateIncomingBatter({
                inningsId: testInnings.id,
                newBatsmanId: playersA[1].id, // Active non-striker
                currentStrikerId: playersA[0].id,
                currentNonStrikerId: playersA[1].id
            });
        } catch (err) {
            errCaught = true;
            assert.ok(err.message.includes("active non-striker"));
        }
        assert.strictEqual(errCaught, true, "Must reject active non-striker");
    });

    await asyncTest("Rejects incoming batter who was the DISMISSED PLAYER (HTTP 400)", async () => {
        let errCaught = false;
        try {
            await validateIncomingBatter({
                inningsId: testInnings.id,
                newBatsmanId: playersA[2].id, // Passed as incoming
                currentStrikerId: playersA[0].id,
                currentNonStrikerId: playersA[1].id,
                dismissedPlayerId: playersA[2].id // Was just dismissed
            });
        } catch (err) {
            errCaught = true;
            assert.ok(err.message.includes("dismissed"));
        }
        assert.strictEqual(errCaught, true, "Must reject player who was just dismissed");
    });

    // -------------------------------------------------------------
    // SECTION 2: WAGON WHEEL & PITCH MAP PERSISTENCE
    // -------------------------------------------------------------
    console.log("\n--- 2. Wagon Wheel & Pitch Map Persistence Tests ---");

    await asyncTest("Records 6 runs to Mid Wicket with Full Length & Stumps line", async () => {
        const res = await createBallService({
            inningsId: testInnings.id,
            batsmanId: playersA[0].id,
            nonStrikerId: playersA[1].id,
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

        assert.strictEqual(res.ball.shotZone, "Mid Wicket");
        assert.strictEqual(res.ball.shotX, 110);
        assert.strictEqual(res.ball.shotY, 55);
        assert.strictEqual(res.ball.pitchLength, "Full");
        assert.strictEqual(res.ball.pitchLine, "Stumps");
        assert.strictEqual(res.liveScore.innings.runs, 6);
        assert.strictEqual(res.liveScore.strike.strikerId, playersA[0].id, "6 does not swap strike");
    });

    await asyncTest("Records 1 run to Cover with Short Length & Off line", async () => {
        const res = await createBallService({
            inningsId: testInnings.id,
            batsmanId: playersA[0].id,
            nonStrikerId: playersA[1].id,
            bowlerId: playersB[10].id,
            batRuns: 1,
            extraRuns: 0,
            extraType: "NONE",
            shotZone: "Cover",
            shotX: -90,
            shotY: 45,
            pitchLength: "Short",
            pitchLine: "Off"
        });

        assert.strictEqual(res.ball.shotZone, "Cover");
        assert.strictEqual(res.ball.pitchLength, "Short");
        assert.strictEqual(res.liveScore.innings.runs, 7);
        assert.strictEqual(res.liveScore.strike.strikerId, playersA[1].id, "1 run swaps strike to player 2");
    });

    await asyncTest("Analytics Engine aggregates Wagon Wheel and Pitch Map deliveries", async () => {
        const balls = await prisma.ball.findMany({ where: { inningsId: testInnings.id } });
        const wagon = buildWagonWheelData(balls);
        const pitch = buildPitchMapData(balls);

        const midWicket = wagon.zoneSummary.find(z => z.zone === "Mid Wicket");
        assert.strictEqual(midWicket.runs, 6);
        assert.strictEqual(midWicket.sixes, 1);

        const cover = wagon.zoneSummary.find(z => z.zone === "Cover");
        assert.strictEqual(cover.runs, 1);

        assert.strictEqual(pitch.pitchLengths["Full"], 1);
        assert.strictEqual(pitch.pitchLengths["Short"], 1);
        assert.strictEqual(pitch.pitchLines["Stumps"], 1);
        assert.strictEqual(pitch.pitchLines["Off"], 1);
        assert.strictEqual(pitch.deliveries.length, 2);
    });

    // -------------------------------------------------------------
    // SECTION 3: UNDO LAST DELIVERY TESTS
    // -------------------------------------------------------------
    console.log("\n--- 3. Undo Last Delivery Integration Tests ---");

    await asyncTest("Undo 1 run delivery reverts score, strike, ball count, and analytics", async () => {
        const undoRes = await undoLastBallService({ matchId: testMatch.id });

        assert.strictEqual(undoRes.success, true);
        assert.strictEqual(undoRes.undoneBall.batRuns, 1);

        // Check refreshed live score
        const updatedInnings = await prisma.innings.findUnique({ where: { id: testInnings.id } });
        assert.strictEqual(updatedInnings.totalRuns, 6, "Total runs reverted from 7 back to 6");
        assert.strictEqual(updatedInnings.legalBalls, 1, "Legal balls reverted from 2 back to 1");

        // Check striker reverted back to player 1
        const activePart = await prisma.partnership.findFirst({
            where: { inningsId: testInnings.id, isActive: true }
        });
        assert.strictEqual(activePart.strikerId, playersA[0].id, "Striker restored to player 1");

        // Check Wagon Wheel analytics after undo
        const remainingBalls = await prisma.ball.findMany({ where: { inningsId: testInnings.id } });
        assert.strictEqual(remainingBalls.length, 1);
        const wagon = buildWagonWheelData(remainingBalls);
        const cover = wagon.zoneSummary.find(z => z.zone === "Cover");
        assert.strictEqual(cover.runs, 0, "Cover runs returned to 0 after undo");
    });

    await asyncTest("Records WICKET delivery with valid incoming batter, then UNDOS the wicket", async () => {
        // Player 1 is on strike, bowled out! Incoming batter is player 3 (Order 3)
        const wicketBall = await createBallService({
            inningsId: testInnings.id,
            batsmanId: playersA[0].id,
            nonStrikerId: playersA[1].id,
            bowlerId: playersB[10].id,
            batRuns: 0,
            extraRuns: 0,
            extraType: "NONE",
            isWicket: true,
            wicketType: "BOWLED",
            dismissedPlayerId: playersA[0].id,
            newBatsmanId: playersA[2].id, // Eligible incoming batter
            shotZone: "Point",
            pitchLength: "Yorker",
            pitchLine: "Stumps"
        });

        assert.strictEqual(wicketBall.liveScore.innings.wickets, 1);
        const dismissedCardBeforeUndo = await prisma.battingScorecard.findFirst({
            where: { inningsId: testInnings.id, playerId: playersA[0].id }
        });
        assert.strictEqual(dismissedCardBeforeUndo.isOut, true, "Player 1 marked out");

        const fowBeforeUndo = await prisma.fallOfWicket.findFirst({
            where: { inningsId: testInnings.id, playerId: playersA[0].id }
        });
        assert.ok(fowBeforeUndo, "FallOfWicket record created");

        // NOW PERFORM UNDO OF THE WICKET DELIVERY!
        const undoWicketRes = await undoLastBallService({ matchId: testMatch.id });
        assert.strictEqual(undoWicketRes.success, true);
        assert.strictEqual(undoWicketRes.undoneBall.isWicket, true);

        // Verify dismissed player is restored to NOT OUT
        const dismissedCardAfterUndo = await prisma.battingScorecard.findFirst({
            where: { inningsId: testInnings.id, playerId: playersA[0].id }
        });
        assert.strictEqual(dismissedCardAfterUndo.isOut, false, "Player 1 restored to isOut: false");
        assert.strictEqual(dismissedCardAfterUndo.dismissalType, null, "Dismissal type cleared");

        // Verify FallOfWicket was deleted
        const fowAfterUndo = await prisma.fallOfWicket.findFirst({
            where: { inningsId: testInnings.id, playerId: playersA[0].id }
        });
        assert.strictEqual(fowAfterUndo, null, "FallOfWicket record removed");

        // Verify wickets count is back to 0
        const inningsAfterUndo = await prisma.innings.findUnique({ where: { id: testInnings.id } });
        assert.strictEqual(inningsAfterUndo.wickets, 0, "Wickets count restored to 0");

        // Verify active partnership restored to original pair (Player 1 & Player 2)
        const activePartAfterUndo = await prisma.partnership.findFirst({
            where: { inningsId: testInnings.id, isActive: true }
        });
        assert.ok(activePartAfterUndo);
        assert.strictEqual(activePartAfterUndo.strikerId, playersA[0].id);
        assert.strictEqual(activePartAfterUndo.nonStrikerId, playersA[1].id);
    });

    await asyncTest("Records Extra (WIDE with 2 runs) and verifies undo restores extras and balls", async () => {
        // Record 2 extra runs on WIDE
        await createBallService({
            inningsId: testInnings.id,
            batsmanId: playersA[0].id,
            nonStrikerId: playersA[1].id,
            bowlerId: playersB[10].id,
            batRuns: 0,
            extraRuns: 2,
            extraType: "WIDE",
            pitchLength: "Good",
            pitchLine: "Wide"
        });

        const inningsWithWide = await prisma.innings.findUnique({ where: { id: testInnings.id } });
        assert.strictEqual(inningsWithWide.totalRuns, 8, "Runs increased by 2");
        assert.strictEqual(inningsWithWide.legalBalls, 1, "Legal balls did not increment on wide");

        // Undo the wide
        await undoLastBallService({ matchId: testMatch.id });

        const inningsAfterWideUndo = await prisma.innings.findUnique({ where: { id: testInnings.id } });
        assert.strictEqual(inningsAfterWideUndo.totalRuns, 6, "Runs restored to 6");
        assert.strictEqual(inningsAfterWideUndo.legalBalls, 1, "Legal balls remains 1");
    });

    // Cleanup
    console.log("\n🧹 Cleaning up test artifacts...");
    if (testInnings?.id) {
        await prisma.ball.deleteMany({ where: { inningsId: testInnings.id } });
        await prisma.fallOfWicket.deleteMany({ where: { inningsId: testInnings.id } });
        await prisma.partnership.deleteMany({ where: { inningsId: testInnings.id } });
        await prisma.battingScorecard.deleteMany({ where: { inningsId: testInnings.id } });
        await prisma.bowlingScorecard.deleteMany({ where: { inningsId: testInnings.id } });
    }
    if (testMatch?.id) {
        await prisma.innings.deleteMany({ where: { matchId: testMatch.id } });
        await prisma.notification.deleteMany({ where: { matchId: testMatch.id } });
        await prisma.auditLog.deleteMany({ where: { entityId: testMatch.id } });
        await prisma.playingXI.deleteMany({ where: { matchId: testMatch.id } });
        await prisma.match.deleteMany({ where: { id: testMatch.id } });
    }
    if (testTeamA?.id && testTeamB?.id) {
        await prisma.player.deleteMany({ where: { teamId: { in: [testTeamA.id, testTeamB.id] } } });
        await prisma.team.deleteMany({ where: { id: { in: [testTeamA.id, testTeamB.id] } } });
    }
    if (testTournament?.id) {
        await prisma.tournament.deleteMany({ where: { id: testTournament.id } });
    }

    console.log(`\n======================================================`);
    console.log(`TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log(`======================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error("Test runner encountered fatal error:", err);
    process.exit(1);
});
