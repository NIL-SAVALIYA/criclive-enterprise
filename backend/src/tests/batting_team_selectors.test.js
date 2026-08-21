import assert from "node:assert";
import prisma from "../config/db.js";
import { startMatch } from "../services/startMatch.service.js";
import { createBallService } from "../services/ball.service.js";
import { getEligibleIncomingBatters, validateIncomingBatter } from "../services/batterEligibility.service.js";

async function runBattingTeamSelectorsTests() {
    console.log("\n🧪 Running Batting Team Scoping & Player Eligibility Selector Test Suite...\n");

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
            name: `Batting Scope Tourney ${ts}`,
            format: "LEAGUE",
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            status: "UPCOMING"
        }
    });

    const teamA = await prisma.team.create({
        data: { name: `Team Alpha Bat ${ts}`, shortName: `TAB${ts.toString().slice(-4)}`, city: "City A" }
    });

    const teamB = await prisma.team.create({
        data: { name: `Team Beta Bowl ${ts}`, shortName: `TBB${ts.toString().slice(-4)}`, city: "City B" }
    });

    const playersA = [];
    for (let i = 1; i <= 11; i++) {
        const p = await prisma.player.create({
            data: {
                firstName: `BatAlpha${i}`,
                lastName: `Player`,
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
                firstName: `BowlBeta${i}`,
                lastName: `Player`,
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
            venue: "Scope Arena",
            status: "UPCOMING",
            tossWinnerId: teamA.id,
            tossDecision: "BAT"
        }
    });

    // Populate Playing XI for both teams
    for (let i = 0; i < 11; i++) {
        await prisma.playingXI.create({
            data: { matchId: match.id, teamId: teamA.id, playerId: playersA[i].id, battingOrder: i + 1 }
        });
        await prisma.playingXI.create({
            data: { matchId: match.id, teamId: teamB.id, playerId: playersB[i].id, battingOrder: i + 1 }
        });
    }

    // Start match: Team A bats, Team B bowls
    await startMatch(
        match.id,
        playersA[0].id,
        playersA[1].id,
        playersB[0].id
    );

    const innings1 = await prisma.innings.findFirst({
        where: { matchId: match.id, status: "LIVE" }
    });

    await test("1. Innings 1 Batting Team Scoping: Striker & Non-Striker belong strictly to Team A", async () => {
        const eligible = await getEligibleIncomingBatters({
            inningsId: innings1.id,
            currentStrikerId: playersA[0].id,
            currentNonStrikerId: playersA[1].id
        });

        assert.strictEqual(eligible.length, 9, "9 remaining players in Playing XI should be eligible");
        for (const p of eligible) {
            assert.strictEqual(p.teamId, teamA.id, "Every eligible incoming batter must belong to Team A");
            assert.notStrictEqual(p.id, playersA[0].id, "Active striker must not be eligible as incoming");
            assert.notStrictEqual(p.id, playersA[1].id, "Active non-striker must not be eligible as incoming");
        }
    });

    await test("2. Opponent Isolation: No Team B players in Innings 1 eligible incoming batters", async () => {
        const eligible = await getEligibleIncomingBatters({
            inningsId: innings1.id,
            currentStrikerId: playersA[0].id,
            currentNonStrikerId: playersA[1].id
        });

        const teamBIds = new Set(playersB.map(p => p.id));
        for (const p of eligible) {
            assert.ok(!teamBIds.has(p.id), `Team B player ${p.id} must NEVER appear in Team A batting selector`);
        }
    });

    await test("3. validateIncomingBatter accepts eligible Team A player and rejects Team B player", async () => {
        // Valid Team A player (e.g. playersA[2])
        const valid = await validateIncomingBatter({
            inningsId: innings1.id,
            incomingBatterId: playersA[2].id,
            currentStrikerId: playersA[0].id,
            currentNonStrikerId: playersA[1].id
        });
        assert.ok(valid.isValid, "Team A #3 player must be valid");

        // Invalid Team B player (e.g. playersB[0])
        let rejected = false;
        try {
            await validateIncomingBatter({
                inningsId: innings1.id,
                incomingBatterId: playersB[0].id,
                currentStrikerId: playersA[0].id,
                currentNonStrikerId: playersA[1].id
            });
        } catch {
            rejected = true;
        }
        assert.ok(rejected, "Team B player must be rejected by validateIncomingBatter");
    });

    await test("4. Wicket dismissal: Dismissed player excluded from subsequent incoming batter lists", async () => {
        // Record a wicket ball dismissing striker playersA[0], new batter is playersA[2]
        await createBallService({
            matchId: match.id,
            inningsId: innings1.id,
            batsmanId: playersA[0].id,
            nonStrikerId: playersA[1].id,
            bowlerId: playersB[0].id,
            batRuns: 0,
            extraRuns: 0,
            extraType: "NONE",
            isWicket: true,
            wicketType: "BOWLED",
            dismissedPlayerId: playersA[0].id,
            newBatsmanId: playersA[2].id
        });

        // Now new active striker is playersA[2], non-striker is playersA[1]
        // Eligible batters should now be 8 players (excluding playersA[0] who is OUT, and playersA[1], playersA[2])
        const eligibleAfterWicket = await getEligibleIncomingBatters({
            inningsId: innings1.id,
            currentStrikerId: playersA[2].id,
            currentNonStrikerId: playersA[1].id
        });

        assert.strictEqual(eligibleAfterWicket.length, 8, "Should have 8 eligible batters remaining");
        const eligibleIds = eligibleAfterWicket.map(p => p.id);
        assert.ok(!eligibleIds.includes(playersA[0].id), "Dismissed player playersA[0] must NOT be in eligible list");
        assert.ok(!eligibleIds.includes(playersA[1].id), "Current non-striker playersA[1] must NOT be in eligible list");
        assert.ok(!eligibleIds.includes(playersA[2].id), "Current striker playersA[2] must NOT be in eligible list");
    });

    await test("5. Innings 2 Switch: When Team B bats, selectors strictly switch to Team B", async () => {
        // Create 2nd Innings where Team B is batting
        await prisma.innings.update({
            where: { id: innings1.id },
            data: { status: "COMPLETED" }
        });

        const innings2 = await prisma.innings.create({
            data: {
                matchId: match.id,
                inningsNumber: 2,
                battingTeamId: teamB.id,
                bowlingTeamId: teamA.id,
                status: "LIVE"
            }
        });

        // Create initial batting scorecards for Team B
        await prisma.battingScorecard.createMany({
            data: playersB.map((p, idx) => ({
                inningsId: innings2.id,
                playerId: p.id,
                battingPosition: idx + 1
            }))
        });

        const eligibleInnings2 = await getEligibleIncomingBatters({
            inningsId: innings2.id,
            currentStrikerId: playersB[0].id,
            currentNonStrikerId: playersB[1].id
        });

        assert.strictEqual(eligibleInnings2.length, 9, "9 remaining Team B players should be eligible in Innings 2");
        for (const p of eligibleInnings2) {
            assert.strictEqual(p.teamId, teamB.id, "All Innings 2 eligible batters must belong to Team B");
        }

        const teamAIds = new Set(playersA.map(p => p.id));
        for (const p of eligibleInnings2) {
            assert.ok(!teamAIds.has(p.id), "No Team A players must appear in Innings 2 batting selectors");
        }
    });

    console.log(`\n========================================`);
    console.log(`BATTING SELECTOR TESTS: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runBattingTeamSelectorsTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test runner failed:", err);
        process.exit(1);
    });
