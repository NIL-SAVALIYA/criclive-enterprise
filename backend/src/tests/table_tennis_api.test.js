import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../app.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { Roles } from '../constants/roles.js';

test('Table Tennis API Integration Suite', async (t) => {
  // 1. Setup Server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  // 2. Database Seeding & Mock User Setup
  const ts = Date.now();
  
  // Ensure TT sport
  await prisma.sport.upsert({
    where: { code: 'TABLE_TENNIS' },
    update: {},
    create: { code: 'TABLE_TENNIS', name: 'Table Tennis', isActive: true }
  });
  const ttSport = await prisma.sport.findUnique({ where: { code: 'TABLE_TENNIS' } });
  
  // Ensure Scorer Role
  const scorerRole = await prisma.role.upsert({
    where: { name: Roles.SCORER },
    update: {},
    create: { name: Roles.SCORER, description: 'Scorer' }
  });

  // Create Scorer User
  const scorer = await prisma.user.create({
    data: {
      firstName: 'TT', lastName: 'Scorer', email: `scorer_${ts}@example.com`,
      password: 'hash', roleId: scorerRole.id
    }
  });

  const scorerToken = jwt.sign({ userId: scorer.id, role: Roles.SCORER }, env.JWT_SECRET || "development-secret", { expiresIn: '1h' });
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${scorerToken}`
  };

  // Create Tournament, Teams, Players, Matches
  const tournament = await prisma.tournament.create({
    data: { name: `TT Tourney ${ts}`, format: 'LEAGUE', startDate: new Date(), endDate: new Date(), sportId: ttSport.id }
  });

  const teamA = await prisma.team.create({ data: { name: `Team A ${ts}`, shortName: `TA${ts}`, city: 'City A' } });
  const teamB = await prisma.team.create({ data: { name: `Team B ${ts}`, shortName: `TB${ts}`, city: 'City B' } });

  const A = await prisma.player.create({ data: { firstName: 'Player', lastName: 'A', teamId: teamA.id } });
  const B = await prisma.player.create({ data: { firstName: 'Player', lastName: 'B', teamId: teamA.id } });
  const C = await prisma.player.create({ data: { firstName: 'Player', lastName: 'C', teamId: teamB.id } });
  const D = await prisma.player.create({ data: { firstName: 'Player', lastName: 'D', teamId: teamB.id } });

  const match = await prisma.match.create({
    data: { tournamentId: tournament.id, teamAId: teamA.id, teamBId: teamB.id, matchDate: new Date(), venue: 'TT Court 1', scorerId: scorer.id }
  });

  const doublesMatch = await prisma.match.create({
    data: { tournamentId: tournament.id, teamAId: teamA.id, teamBId: teamB.id, matchDate: new Date(), venue: 'TT Court 2', scorerId: scorer.id }
  });

  // Set up PlayingXI for doubles
  await prisma.playingXI.create({ data: { matchId: doublesMatch.id, teamId: teamA.id, playerId: A.id, isCaptain: true, battingOrder: 1 } });
  await prisma.playingXI.create({ data: { matchId: doublesMatch.id, teamId: teamA.id, playerId: B.id, isCaptain: false, battingOrder: 2 } });
  await prisma.playingXI.create({ data: { matchId: doublesMatch.id, teamId: teamB.id, playerId: C.id, isCaptain: true, battingOrder: 1 } });
  await prisma.playingXI.create({ data: { matchId: doublesMatch.id, teamId: teamB.id, playerId: D.id, isCaptain: false, battingOrder: 2 } });

  // 3. Tests

  await t.test('A. Match initialization (Singles)', async () => {
    const res = await fetch(`${baseUrl}/table-tennis/matches/${match.id}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ format: 'SINGLES', bestOf: 3, initialServerId: A.id, initialReceiverId: C.id, servingTeamId: teamA.id })
    });
    const data = await res.json();
    console.log("TEST A DATA:", JSON.stringify(data, null, 2));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.matchState.format, 'SINGLES');
    assert.strictEqual(data.data.matchState.status, 'LIVE');
  });

  await t.test('B. Match state fetch', async () => {
    const res = await fetch(`${baseUrl}/table-tennis/matches/${match.id}/state`, { headers });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.matchState.format, 'SINGLES');
    assert.strictEqual(data.data.matchState.currentGameNumber, 1);
  });

  await t.test('C. Point scoring', async () => {
    const res = await fetch(`${baseUrl}/table-tennis/matches/${match.id}/point`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ scoringTeamId: teamA.id })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.data.matchState.games[0].teamAScore, 1);
  });

  await t.test('D. Undo Point', async () => {
    const res = await fetch(`${baseUrl}/table-tennis/matches/${match.id}/undo`, {
      method: 'POST',
      headers
    });
    const data = await res.json();
    console.log("TEST D DATA:", data);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.matchState.games[0].teamAScore, 0);
  });

  await t.test('E. Doubles start and point', async () => {
    // Start Doubles Match
    let res = await fetch(`${baseUrl}/table-tennis/matches/${doublesMatch.id}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ format: 'DOUBLES', bestOf: 3, initialServerId: A.id, initialReceiverId: C.id, servingTeamId: teamA.id })
    });
    assert.strictEqual(res.status, 200);

    // Score point
    res = await fetch(`${baseUrl}/table-tennis/matches/${doublesMatch.id}/point`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ scoringTeamId: teamB.id })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.data.matchState.currentServerId, A.id);
    assert.strictEqual(data.data.matchState.currentReceiverId, C.id);
  });

  await t.test('F. Get Scorecard', async () => {
    const res = await fetch(`${baseUrl}/table-tennis/matches/${match.id}/scorecard`, { headers });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Array.isArray(data.data.games), true);
  });

  await t.test('G. Sport isolation (Cricket match)', async () => {
    const cricketSport = await prisma.sport.upsert({
      where: { code: 'CRICKET' },
      update: {},
      create: { code: 'CRICKET', name: 'Cricket', isActive: true }
    });
    const cTourney = await prisma.tournament.create({
      data: { name: `Cricket Tourney ${ts}`, format: 'LEAGUE', startDate: new Date(), endDate: new Date(), sportId: cricketSport.id }
    });
    const cMatch = await prisma.match.create({
      data: { tournamentId: cTourney.id, teamAId: teamA.id, teamBId: teamB.id, matchDate: new Date(), venue: 'Cricket Ground', scorerId: scorer.id }
    });

    const res = await fetch(`${baseUrl}/table-tennis/matches/${cMatch.id}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ format: 'SINGLES' })
    });
    assert.strictEqual(res.status, 400); // Because sportGuard rejects non-table-tennis matches
  });

  await t.test('H. Authorization (No Token)', async () => {
    const res = await fetch(`${baseUrl}/table-tennis/matches/${match.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'SINGLES' })
    });
    assert.strictEqual(res.status, 401);
  });

  server.close();
});
