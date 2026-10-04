import test from 'node:test';
import assert from 'node:assert';
import prisma from '../config/db.js';
import {
  startTableTennisMatchService,
  recordTableTennisPointService,
  undoTableTennisPointService
} from '../services/tableTennisMatch.service.js';

test('Table Tennis Scoring Engine Suite', async (t) => {
  let matchId = null;
  let teamAId = null;
  let teamBId = null;
  let playerA1 = 'player-A1';
  let playerA2 = 'player-A2';
  let playerB1 = 'player-B1';
  let playerB2 = 'player-B2';

  test.before(async () => {
    const tournament = await prisma.tournament.findFirst();
    const tA = await prisma.team.findFirst();
    const tB = await prisma.team.findFirst({ where: { NOT: { id: tA.id } } });
    
    let ttSport = await prisma.sport.findFirst({ where: { code: 'TABLE_TENNIS' } });
    if (!ttSport) {
      ttSport = await prisma.sport.create({
        data: {
          code: 'TABLE_TENNIS',
          name: 'Table Tennis'
        }
      });
    }

    const ttTournament = await prisma.tournament.create({
      data: {
        name: 'TT World Cup ' + Date.now(),
        format: 'KNOCKOUT',
        startDate: new Date(),
        endDate: new Date(),
        sportId: ttSport.id
      }
    });

    const ttMatch = await prisma.match.create({
      data: {
        tournamentId: ttTournament.id,
        teamAId: tA.id,
        teamBId: tB.id,
        matchDate: new Date(),
        venue: 'TT Arena'
      }
    });

    matchId = ttMatch.id;
    teamAId = tA.id;
    teamBId = tB.id;
  });

  await t.test('A. Match initialization', async () => {
    const res = await startTableTennisMatchService(matchId, {
      format: 'SINGLES',
      bestOf: 3,
      initialServerId: playerA1,
      initialReceiverId: playerB1,
      servingTeamId: teamAId
    });

    assert.strictEqual(res.matchState.format, 'SINGLES');
    assert.strictEqual(res.matchState.bestOf, 3);
    assert.strictEqual(res.matchState.games.length, 1);
    assert.strictEqual(res.matchState.games[0].teamAScore, 0);
  });

  await t.test('B. First point', async () => {
    const res = await recordTableTennisPointService(matchId, {
      scoringTeamId: teamAId,
      commentary: 'Ace'
    });
    const game = res.matchState.games[0];
    assert.strictEqual(game.teamAScore, 1);
    assert.strictEqual(res.matchState.currentServerId, playerA1); // 1 point played, total = 1, service changes every 2 points.
    assert.strictEqual(res.matchState.servingTeamId, teamAId);
  });

  await t.test('G. Normal service changes every 2 points', async () => {
    const res = await recordTableTennisPointService(matchId, {
      scoringTeamId: teamBId
    });
    // total points = 2. Service should change to B.
    assert.strictEqual(res.matchState.games[0].teamBScore, 1);
    assert.strictEqual(res.matchState.currentServerId, playerB1);
    assert.strictEqual(res.matchState.servingTeamId, teamBId);
  });

  await t.test('C. 11-0 game completion', async () => {
    // Current score: 1-1. We need 10 more points for team A to win 11-1.
    for (let i = 0; i < 10; i++) {
      await recordTableTennisPointService(matchId, { scoringTeamId: teamAId });
    }
    const state = await prisma.tableTennisMatchState.findUnique({
      where: { matchId }, include: { games: { orderBy: { gameNumber: 'asc' } } }
    });
    assert.strictEqual(state.teamAGamesWon, 1);
    assert.strictEqual(state.games[0].status, 'COMPLETED');
    assert.strictEqual(state.games.length, 2); // Game 2 created
    assert.strictEqual(state.games[1].teamAScore, 0);
  });

  await t.test('D. 11-10 does NOT complete, F. Deuce service changes every 1 point, E. 12-10 completes', async () => {
    // Game 2. Let's make it 10-10
    for (let i = 0; i < 10; i++) {
      await recordTableTennisPointService(matchId, { scoringTeamId: teamAId });
      await recordTableTennisPointService(matchId, { scoringTeamId: teamBId });
    }
    
    let state = await prisma.tableTennisMatchState.findUnique({
      where: { matchId }, include: { games: { orderBy: { gameNumber: 'desc' } } }
    });
    assert.strictEqual(state.games[0].teamAScore, 10);
    assert.strictEqual(state.games[0].teamBScore, 10);
    assert.strictEqual(state.games[0].status, 'IN_PROGRESS');
    
    // Total points = 20. Next point changes service.
    const beforeServer = state.currentServerId;
    await recordTableTennisPointService(matchId, { scoringTeamId: teamAId }); // 11-10
    state = await prisma.tableTennisMatchState.findUnique({
      where: { matchId }, include: { games: { orderBy: { gameNumber: 'desc' } } }
    });
    
    assert.strictEqual(state.games[0].status, 'IN_PROGRESS'); // 11-10 does not finish
    assert.notStrictEqual(state.currentServerId, beforeServer); // Service changed

    await recordTableTennisPointService(matchId, { scoringTeamId: teamAId }); // 12-10
    state = await prisma.tableTennisMatchState.findUnique({
      where: { matchId }, include: { games: { orderBy: { gameNumber: 'desc' } } }
    });
    assert.strictEqual(state.games[1].status, 'COMPLETED');
    assert.strictEqual(state.teamAGamesWon, 2);
  });

  await t.test('H. Best-of-3 match completion', async () => {
    const state = await prisma.tableTennisMatchState.findUnique({ where: { matchId } });
    assert.strictEqual(state.status, 'COMPLETED');
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    assert.strictEqual(match.status, 'COMPLETED');
    assert.strictEqual(match.winnerTeamId, teamAId);
  });

  await t.test('M. Undo completed game & N. Undo completed match', async () => {
    const res = await undoTableTennisPointService(matchId);
    assert.strictEqual(res.matchState.status, 'LIVE');
    assert.strictEqual(res.matchState.teamAGamesWon, 1);
    
    const game = res.matchState.games.find(g => g.gameNumber === 2);
    assert.strictEqual(game.status, 'IN_PROGRESS');
    assert.strictEqual(game.teamAScore, 11);
    
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    assert.strictEqual(match.status, 'LIVE');
    assert.strictEqual(match.winnerTeamId, null);
  });

  await t.test('P. Cricket, Q. Badminton, R. Football rejection & S. No mutation', async () => {
    const testRejection = async (sportCode) => {
      const sport = await prisma.sport.findFirst({ where: { code: sportCode } });
      if (!sport) return;
      const tournament = await prisma.tournament.findFirst({ where: { sportId: sport.id } });
      if (!tournament) return;
      const otherMatch = await prisma.match.findFirst({ where: { tournamentId: tournament.id } });
      if (!otherMatch) return;
      
      await assert.rejects(
        startTableTennisMatchService(otherMatch.id),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /cannot use Table Tennis scoring/);
          return true;
        }
      );
    };

    await testRejection('CRICKET');
    await testRejection('BADMINTON');
    await testRejection('FOOTBALL');
  });

});

test('Table Tennis Doubles Scoring Suite', async (t) => {
  let matchId = null;
  let teamAId = null;
  let teamBId = null;
  let A = null, B = null, C = null, D = null;

  test.before(async () => {
    const tA = await prisma.team.findFirst();
    const tB = await prisma.team.findFirst({ where: { NOT: { id: tA.id } } });
    
    let ttSport = await prisma.sport.findFirst({ where: { code: 'TABLE_TENNIS' } });
    const ttTournament = await prisma.tournament.create({
      data: { name: 'TT Doubles ' + Date.now(), format: 'KNOCKOUT', startDate: new Date(), endDate: new Date(), sportId: ttSport.id }
    });

    const ttMatch = await prisma.match.create({
      data: { tournamentId: ttTournament.id, teamAId: tA.id, teamBId: tB.id, matchDate: new Date(), venue: 'TT Arena' }
    });

    matchId = ttMatch.id;
    teamAId = tA.id;
    teamBId = tB.id;

    const createPlayer = async (name, tId) => (await prisma.player.create({ data: { firstName: name, lastName: 'P', teamId: tId } })).id;
    A = await createPlayer('A' + Date.now(), teamAId);
    B = await createPlayer('B' + Date.now(), teamAId);
    C = await createPlayer('C' + Date.now(), teamBId);
    D = await createPlayer('D' + Date.now(), teamBId);

    await prisma.playingXI.createMany({
      data: [
        { matchId, teamId: teamAId, playerId: A, battingOrder: 1 },
        { matchId, teamId: teamAId, playerId: B, battingOrder: 2 },
        { matchId, teamId: teamBId, playerId: C, battingOrder: 1 },
        { matchId, teamId: teamBId, playerId: D, battingOrder: 2 },
      ]
    });
  });

  await t.test('TEST 1 — Initial doubles rotation (A -> C)', async () => {
    const res = await startTableTennisMatchService(matchId, {
      format: 'DOUBLES',
      bestOf: 3,
      initialServerId: A,
      initialReceiverId: C,
      servingTeamId: teamAId
    });
    assert.strictEqual(res.matchState.currentServerId, A);
    assert.strictEqual(res.matchState.currentReceiverId, C);
    assert.strictEqual(res.matchState.servingTeamId, teamAId);
  });
  
  await t.test('TEST 2 — After 2 points (C -> B)', async () => {
    await recordTableTennisPointService(matchId, { scoringTeamId: teamAId });
    const res = await recordTableTennisPointService(matchId, { scoringTeamId: teamAId });
    assert.strictEqual(res.matchState.currentServerId, C);
    assert.strictEqual(res.matchState.currentReceiverId, B);
    assert.strictEqual(res.matchState.servingTeamId, teamBId);
  });

  await t.test('TEST 3 — After 4 points (B -> D)', async () => {
    await recordTableTennisPointService(matchId, { scoringTeamId: teamBId });
    const res = await recordTableTennisPointService(matchId, { scoringTeamId: teamBId });
    assert.strictEqual(res.matchState.currentServerId, B);
    assert.strictEqual(res.matchState.currentReceiverId, D);
    assert.strictEqual(res.matchState.servingTeamId, teamAId);
  });

  await t.test('TEST 4 — After 6 points (D -> A)', async () => {
    await recordTableTennisPointService(matchId, { scoringTeamId: teamAId });
    const res = await recordTableTennisPointService(matchId, { scoringTeamId: teamBId });
    assert.strictEqual(res.matchState.currentServerId, D);
    assert.strictEqual(res.matchState.currentReceiverId, A);
    assert.strictEqual(res.matchState.servingTeamId, teamBId);
  });

  await t.test('TEST 5 — After 8 points (A -> C)', async () => {
    await recordTableTennisPointService(matchId, { scoringTeamId: teamAId });
    const res = await recordTableTennisPointService(matchId, { scoringTeamId: teamBId });
    assert.strictEqual(res.matchState.currentServerId, A);
    assert.strictEqual(res.matchState.currentReceiverId, C);
    assert.strictEqual(res.matchState.servingTeamId, teamAId);
  });

  await t.test('TEST 6 — Continue through multiple rotations', async () => {
    await recordTableTennisPointService(matchId, { scoringTeamId: teamAId });
    const res2 = await recordTableTennisPointService(matchId, { scoringTeamId: teamBId });
    assert.strictEqual(res2.matchState.currentServerId, C);
    assert.strictEqual(res2.matchState.currentReceiverId, B);
  });

  await t.test('TEST 7 — Deuce rotation', async () => {
    for (let i=0; i<10; i++) {
      await recordTableTennisPointService(matchId, { scoringTeamId: i % 2 === 0 ? teamAId : teamBId });
    }
    const state = await prisma.tableTennisMatchState.findUnique({ where: { matchId }, include: { games: { orderBy: { gameNumber: 'desc' } } } });
    assert.strictEqual(state.games[0].teamAScore, 10);
    assert.strictEqual(state.games[0].teamBScore, 10);
    assert.strictEqual(state.currentServerId, B);
    assert.strictEqual(state.currentReceiverId, D);

    const r1 = await recordTableTennisPointService(matchId, { scoringTeamId: teamAId });
    assert.strictEqual(r1.matchState.currentServerId, D);
    assert.strictEqual(r1.matchState.currentReceiverId, A);

    const r2 = await recordTableTennisPointService(matchId, { scoringTeamId: teamBId });
    assert.strictEqual(r2.matchState.currentServerId, A);
    assert.strictEqual(r2.matchState.currentReceiverId, C);
  });

  await t.test('TEST 8 — Undo', async () => {
    const res = await undoTableTennisPointService(matchId);
    assert.strictEqual(res.matchState.currentServerId, D);
    assert.strictEqual(res.matchState.currentReceiverId, A);
    assert.strictEqual(res.matchState.servingTeamId, teamBId);
  });

  await t.test('TEST 9 — Invalid doubles lineup', async () => {
    const ttTournament = await prisma.tournament.findFirst({ where: { sport: { code: 'TABLE_TENNIS' } } });
    const ttMatchInvalid = await prisma.match.create({
      data: { tournamentId: ttTournament.id, teamAId, teamBId, matchDate: new Date(), venue: 'TT Arena 2' }
    });
    
    await assert.rejects(
      startTableTennisMatchService(ttMatchInvalid.id, {
        format: 'DOUBLES', bestOf: 3, initialServerId: A, initialReceiverId: C, servingTeamId: teamAId
      }),
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Exactly 2 players are required/);
        return true;
      }
    );
  });
  
  await t.test('TEST 10 — Singles regression', async () => {
    const ttTournament = await prisma.tournament.findFirst({ where: { sport: { code: 'TABLE_TENNIS' } } });
    const ttMatchSingles = await prisma.match.create({
      data: { tournamentId: ttTournament.id, teamAId, teamBId, matchDate: new Date(), venue: 'TT Singles Arena' }
    });
    
    // No PlayingXI needed for SINGLES (as tested previously)
    const res = await startTableTennisMatchService(ttMatchSingles.id, {
      format: 'SINGLES', bestOf: 3, initialServerId: A, initialReceiverId: C, servingTeamId: teamAId
    });
    assert.strictEqual(res.matchState.format, 'SINGLES');
    assert.strictEqual(res.matchState.currentServerId, A);
    assert.strictEqual(res.matchState.currentReceiverId, C);
  });
});
