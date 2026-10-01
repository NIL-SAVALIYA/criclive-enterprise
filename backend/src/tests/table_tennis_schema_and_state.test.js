import test from 'node:test';
import assert from 'node:assert';
import prisma from '../config/db.js';
import { SPORTS_CONFIG } from '../config/sports.config.js';

test('Table Tennis Schema and State Suite', async (t) => {
  let createdMatchId = null;

  await t.test('1. Registry - TABLE_TENNIS is registered', () => {
    assert.ok(SPORTS_CONFIG.TABLE_TENNIS, 'TABLE_TENNIS config must exist');
    assert.strictEqual(SPORTS_CONFIG.TABLE_TENNIS.code, 'TABLE_TENNIS');
    assert.strictEqual(SPORTS_CONFIG.TABLE_TENNIS.scoringModel, 'rally');
  });

  await t.test('2. Prisma - TableTennisMatchState is exposed', () => {
    assert.ok(prisma.tableTennisMatchState, 'Prisma tableTennisMatchState delegate must exist');
  });

  await t.test('3. Prisma - TableTennisGame is exposed', () => {
    assert.ok(prisma.tableTennisGame, 'Prisma tableTennisGame delegate must exist');
  });

  await t.test('4. Prisma - TableTennisPoint is exposed', () => {
    assert.ok(prisma.tableTennisPoint, 'Prisma tableTennisPoint delegate must exist');
  });

  await t.test('5. 1:1 lifecycle & Sport isolation', async () => {
    const dummyTournament = await prisma.tournament.findFirst();
    const teamA = await prisma.team.findFirst();
    const teamB = await prisma.team.findFirst({ where: { NOT: { id: teamA.id } } });
    
    const match = await prisma.match.create({
      data: {
        tournamentId: dummyTournament?.id,
        teamAId: teamA?.id,
        teamBId: teamB?.id,
        matchDate: new Date(),
        venue: 'Table Tennis Arena',
        tableTennisMatchState: {
          create: {
            format: 'SINGLES',
            bestOf: 5,
            teamAGamesWon: 0,
            teamBGamesWon: 0
          }
        }
      },
      include: {
        tableTennisMatchState: true,
        badmintonMatchState: true,
        footballMatchState: true,
        innings: true
      }
    });

    createdMatchId = match.id;

    assert.ok(match.tableTennisMatchState, 'Match must have associated TableTennisMatchState');
    assert.strictEqual(match.tableTennisMatchState.format, 'SINGLES');
    assert.strictEqual(match.tableTennisMatchState.bestOf, 5);
    
    assert.strictEqual(match.innings.length, 0, 'Innings must be empty');
    assert.strictEqual(match.badmintonMatchState, null, 'badmintonMatchState must be null');
    assert.strictEqual(match.footballMatchState, null, 'footballMatchState must be null');
  });

  await t.test('6. Game lifecycle', async () => {
    const match = await prisma.match.findUnique({
      where: { id: createdMatchId },
      include: { tableTennisMatchState: true }
    });

    const game = await prisma.tableTennisGame.create({
      data: {
        tableTennisMatchStateId: match.tableTennisMatchState.id,
        gameNumber: 1,
        teamAScore: 0,
        teamBScore: 0
      }
    });

    assert.ok(game.id, 'Game must be created');
    assert.strictEqual(game.gameNumber, 1);
  });

  await t.test('7. Point lifecycle', async () => {
    const game = await prisma.tableTennisGame.findFirst({
      where: { matchState: { matchId: createdMatchId } }
    });

    const point = await prisma.tableTennisPoint.create({
      data: {
        tableTennisGameId: game.id,
        pointNumber: 1,
        scoringTeamId: 'dummy-team-a-id',
        servingTeamId: 'dummy-team-a-id',
        scoreTeamA: 1,
        scoreTeamB: 0,
        commentary: 'A powerful forehand.'
      }
    });

    assert.ok(point.id, 'Point must be created');
    assert.strictEqual(point.scoreTeamA, 1);
    assert.strictEqual(point.commentary, 'A powerful forehand.');
  });

  await t.test('8. Cascade cleanup', async () => {
    await prisma.match.delete({
      where: { id: createdMatchId }
    });

    const state = await prisma.tableTennisMatchState.findFirst({ where: { matchId: createdMatchId } });
    const games = await prisma.tableTennisGame.findMany({ where: { matchState: { matchId: createdMatchId } } });

    assert.strictEqual(state, null, 'MatchState should be cascade deleted');
    assert.strictEqual(games.length, 0, 'Games should be cascade deleted');
  });

});
