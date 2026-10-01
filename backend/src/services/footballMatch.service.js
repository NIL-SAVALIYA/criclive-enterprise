import prisma from "../config/db.js";
import { FootballEventType, MatchStatus } from "@prisma/client";

/**
 * Validates that a match exists and belongs to the FOOTBALL sport.
 * Throws 400 if match belongs to Cricket or Badminton.
 */
export async function validateFootballMatch(matchId, db = prisma) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (matchId && !UUID_REGEX.test(matchId)) {
    const error = new Error("Invalid format for one or more parameters. Check that all IDs are valid UUIDs.");
    error.statusCode = 400;
    throw error;
  }

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: {
        include: { sport: true }
      },
      teamA: true,
      teamB: true
    }
  });

  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }

  const sportCode = match.tournament?.sport?.code;
  if (sportCode && sportCode !== "FOOTBALL") {
    const error = new Error(`Match belongs to ${sportCode} and cannot use Football scoring.`);
    error.statusCode = 400;
    throw error;
  }

  return match;
}

/**
 * Initializes/Starts a Football match.
 */
export async function startFootballMatchService(matchId, options = {}, user = null) {
  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Match has already been completed.");
      error.statusCode = 400;
      throw error;
    }

    // Upsert or retrieve existing state
    let state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id },
      include: {
        events: {
          orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
        }
      }
    });

    if (!state) {
      state = await tx.footballMatchState.create({
        data: {
          matchId: match.id,
          homeScore: 0,
          awayScore: 0,
          currentHalf: 1,
          matchMinute: 0,
          status: MatchStatus.LIVE,
          homePossession: 50.0
        },
        include: {
          events: true
        }
      });

      // Record initial KICKOFF event
      const kickoffEvent = await tx.footballEvent.create({
        data: {
          footballMatchStateId: state.id,
          eventType: FootballEventType.KICKOFF,
          minute: 0,
          teamId: options.kickoffTeamId || null,
          detail: options.detail || "First half kickoff"
        }
      });

      state.events = [kickoffEvent];
    } else if (state.status === MatchStatus.UPCOMING) {
      state = await tx.footballMatchState.update({
        where: { id: state.id },
        data: { status: MatchStatus.LIVE },
        include: {
          events: {
            orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
          }
        }
      });
    }

    // Update parent Match status to LIVE
    if (match.status !== MatchStatus.LIVE) {
      await tx.match.update({
        where: { id: match.id },
        data: { status: MatchStatus.LIVE }
      });
    }

    return {
      match: {
        id: match.id,
        venue: match.venue,
        matchDate: match.matchDate,
        status: MatchStatus.LIVE,
        teamA: match.teamA,
        teamB: match.teamB
      },
      matchState: state,
      events: state.events
    };
  });
}

/**
 * Retrieves Football match state with full event timeline.
 */
export async function getFootballMatchStateService(matchId) {
  const match = await validateFootballMatch(matchId);

  let state = await prisma.footballMatchState.findUnique({
    where: { matchId },
    include: {
      events: {
        orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!state) {
    state = {
      id: null,
      matchId,
      homeScore: 0,
      awayScore: 0,
      currentHalf: 1,
      matchMinute: 0,
      status: match.status,
      homePossession: 50.0,
      events: []
    };
  }

  return {
    sport: "FOOTBALL",
    match: {
      id: match.id,
      venue: match.venue,
      matchDate: match.matchDate,
      status: match.status,
      result: match.result,
      winnerTeamId: match.winnerTeamId,
      teamA: match.teamA,
      teamB: match.teamB
    },
    matchState: state,
    events: state.events || []
  };
}

/**
 * Retrieves event timeline for a Football match.
 */
export async function getFootballEventsService(matchId) {
  const match = await validateFootballMatch(matchId);

  const state = await prisma.footballMatchState.findUnique({
    where: { matchId },
    include: {
      events: {
        orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  return {
    matchId: match.id,
    events: state?.events || []
  };
}

/**
 * Records a Goal event and increments score.
 */
export async function recordGoalService(matchId, goalInput, user = null) {
  const { scoringTeamId, playerId, secondaryPlayerId, minute, detail, isPenalty } = goalInput;

  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Cannot record a goal on a completed match.");
      error.statusCode = 400;
      throw error;
    }

    if (scoringTeamId !== match.teamAId && scoringTeamId !== match.teamBId) {
      const error = new Error("Invalid team. Scoring team must be Team A or Team B.");
      error.statusCode = 400;
      throw error;
    }

    let state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id }
    });

    if (!state) {
      state = await tx.footballMatchState.create({
        data: {
          matchId: match.id,
          homeScore: 0,
          awayScore: 0,
          currentHalf: 1,
          matchMinute: 0,
          status: MatchStatus.LIVE
        }
      });
    }

    const eventMinute = typeof minute === "number" ? Math.max(0, minute) : state.matchMinute;

    const isHome = scoringTeamId === match.teamAId;
    const nextHomeScore = isHome ? state.homeScore + 1 : state.homeScore;
    const nextAwayScore = !isHome ? state.awayScore + 1 : state.awayScore;

    const updatedState = await tx.footballMatchState.update({
      where: { id: state.id },
      data: {
        homeScore: nextHomeScore,
        awayScore: nextAwayScore,
        matchMinute: Math.max(state.matchMinute, eventMinute),
        status: MatchStatus.LIVE
      }
    });

    const event = await tx.footballEvent.create({
      data: {
        footballMatchStateId: state.id,
        eventType: FootballEventType.GOAL,
        minute: eventMinute,
        teamId: scoringTeamId,
        playerId: playerId || null,
        secondaryPlayerId: secondaryPlayerId || null,
        detail: detail || (isPenalty ? "Penalty Goal" : "Goal"),
        metadata: isPenalty ? { isPenalty: true } : null
      }
    });

    const allEvents = await tx.footballEvent.findMany({
      where: { footballMatchStateId: state.id },
      orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
    });

    return {
      matchState: updatedState,
      event,
      events: allEvents
    };
  });
}

/**
 * Records disciplinary card (YELLOW_CARD or RED_CARD).
 */
export async function recordCardService(matchId, cardInput, user = null) {
  const { cardType, teamId, playerId, minute, detail } = cardInput;

  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Cannot record a card on a completed match.");
      error.statusCode = 400;
      throw error;
    }

    const normalizedType = cardType?.trim()?.toUpperCase();
    if (normalizedType !== FootballEventType.YELLOW_CARD && normalizedType !== FootballEventType.RED_CARD) {
      const error = new Error("Invalid card type. Must be YELLOW_CARD or RED_CARD.");
      error.statusCode = 400;
      throw error;
    }

    if (teamId && teamId !== match.teamAId && teamId !== match.teamBId) {
      const error = new Error("Invalid team. Must be Team A or Team B.");
      error.statusCode = 400;
      throw error;
    }

    let state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id }
    });

    if (!state) {
      state = await tx.footballMatchState.create({
        data: {
          matchId: match.id,
          homeScore: 0,
          awayScore: 0,
          currentHalf: 1,
          matchMinute: 0,
          status: MatchStatus.LIVE
        }
      });
    }

    const eventMinute = typeof minute === "number" ? Math.max(0, minute) : state.matchMinute;

    const updatedState = await tx.footballMatchState.update({
      where: { id: state.id },
      data: {
        matchMinute: Math.max(state.matchMinute, eventMinute)
      }
    });

    const event = await tx.footballEvent.create({
      data: {
        footballMatchStateId: state.id,
        eventType: normalizedType,
        minute: eventMinute,
        teamId: teamId || null,
        playerId: playerId || null,
        detail: detail || (normalizedType === FootballEventType.YELLOW_CARD ? "Yellow Card" : "Red Card")
      }
    });

    const allEvents = await tx.footballEvent.findMany({
      where: { footballMatchStateId: state.id },
      orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
    });

    return {
      matchState: updatedState,
      event,
      events: allEvents
    };
  });
}

/**
 * Records player substitution.
 */
export async function recordSubstitutionService(matchId, subInput, user = null) {
  const { teamId, playerLeavingId, playerEnteringId, minute, detail } = subInput;

  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Cannot record a substitution on a completed match.");
      error.statusCode = 400;
      throw error;
    }

    if (teamId && teamId !== match.teamAId && teamId !== match.teamBId) {
      const error = new Error("Invalid team for substitution.");
      error.statusCode = 400;
      throw error;
    }

    let state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id }
    });

    if (!state) {
      state = await tx.footballMatchState.create({
        data: {
          matchId: match.id,
          homeScore: 0,
          awayScore: 0,
          currentHalf: 1,
          matchMinute: 0,
          status: MatchStatus.LIVE
        }
      });
    }

    const eventMinute = typeof minute === "number" ? Math.max(0, minute) : state.matchMinute;

    const updatedState = await tx.footballMatchState.update({
      where: { id: state.id },
      data: {
        matchMinute: Math.max(state.matchMinute, eventMinute)
      }
    });

    const event = await tx.footballEvent.create({
      data: {
        footballMatchStateId: state.id,
        eventType: FootballEventType.SUBSTITUTION,
        minute: eventMinute,
        teamId: teamId || null,
        playerId: playerLeavingId || null,
        secondaryPlayerId: playerEnteringId || null,
        detail: detail || "Player Substitution"
      }
    });

    const allEvents = await tx.footballEvent.findMany({
      where: { footballMatchStateId: state.id },
      orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
    });

    return {
      matchState: updatedState,
      event,
      events: allEvents
    };
  });
}

/**
 * Records penalty event.
 * If isScored is true: records as a goal with metadata.
 * If isScored is false: records as a PENALTY event without score change.
 */
export async function recordPenaltyService(matchId, penaltyInput, user = null) {
  const { teamId, playerId, minute, isScored, detail } = penaltyInput;

  if (isScored) {
    return recordGoalService(
      matchId,
      {
        scoringTeamId: teamId,
        playerId,
        minute,
        detail: detail || "Penalty Goal",
        isPenalty: true
      },
      user
    );
  }

  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Cannot record a penalty on a completed match.");
      error.statusCode = 400;
      throw error;
    }

    if (teamId && teamId !== match.teamAId && teamId !== match.teamBId) {
      const error = new Error("Invalid team for penalty.");
      error.statusCode = 400;
      throw error;
    }

    let state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id }
    });

    if (!state) {
      state = await tx.footballMatchState.create({
        data: {
          matchId: match.id,
          homeScore: 0,
          awayScore: 0,
          currentHalf: 1,
          matchMinute: 0,
          status: MatchStatus.LIVE
        }
      });
    }

    const eventMinute = typeof minute === "number" ? Math.max(0, minute) : state.matchMinute;

    const updatedState = await tx.footballMatchState.update({
      where: { id: state.id },
      data: {
        matchMinute: Math.max(state.matchMinute, eventMinute)
      }
    });

    const event = await tx.footballEvent.create({
      data: {
        footballMatchStateId: state.id,
        eventType: FootballEventType.PENALTY,
        minute: eventMinute,
        teamId: teamId || null,
        playerId: playerId || null,
        detail: detail || "Penalty missed / saved",
        metadata: { isScored: false }
      }
    });

    const allEvents = await tx.footballEvent.findMany({
      where: { footballMatchStateId: state.id },
      orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
    });

    return {
      matchState: updatedState,
      event,
      events: allEvents
    };
  });
}

/**
 * Records kickoff event.
 */
export async function recordKickoffService(matchId, kickoffInput = {}, user = null) {
  const { minute = 0, teamId = null, detail = "Kickoff" } = kickoffInput;

  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Cannot record kickoff on a completed match.");
      error.statusCode = 400;
      throw error;
    }

    let state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id }
    });

    if (!state) {
      state = await tx.footballMatchState.create({
        data: {
          matchId: match.id,
          homeScore: 0,
          awayScore: 0,
          currentHalf: 1,
          matchMinute: 0,
          status: MatchStatus.LIVE
        }
      });
    }

    const event = await tx.footballEvent.create({
      data: {
        footballMatchStateId: state.id,
        eventType: FootballEventType.KICKOFF,
        minute: Math.max(0, minute),
        teamId: teamId || null,
        detail
      }
    });

    const allEvents = await tx.footballEvent.findMany({
      where: { footballMatchStateId: state.id },
      orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
    });

    return {
      matchState: state,
      event,
      events: allEvents
    };
  });
}

/**
 * Records half-time whistle.
 */
export async function recordHalfTimeService(matchId, options = {}, user = null) {
  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Cannot record half-time on a completed match.");
      error.statusCode = 400;
      throw error;
    }

    const state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id }
    });

    if (!state) {
      const error = new Error("Football match state not initialized.");
      error.statusCode = 400;
      throw error;
    }

    if (state.currentHalf !== 1) {
      const error = new Error("Half-time whistle can only occur in the first half.");
      error.statusCode = 400;
      throw error;
    }

    const eventMinute = options.minute || Math.max(state.matchMinute, 45);

    const updatedState = await tx.footballMatchState.update({
      where: { id: state.id },
      data: {
        matchMinute: Math.max(state.matchMinute, eventMinute)
      }
    });

    const event = await tx.footballEvent.create({
      data: {
        footballMatchStateId: state.id,
        eventType: FootballEventType.HALF_TIME,
        minute: eventMinute,
        detail: options.detail || "Half-time whistle"
      }
    });

    const allEvents = await tx.footballEvent.findMany({
      where: { footballMatchStateId: state.id },
      orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
    });

    return {
      matchState: updatedState,
      event,
      events: allEvents
    };
  });
}

/**
 * Starts second half.
 */
export async function startSecondHalfService(matchId, options = {}, user = null) {
  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Cannot start second half on a completed match.");
      error.statusCode = 400;
      throw error;
    }

    const state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id }
    });

    if (!state) {
      const error = new Error("Football match state not initialized.");
      error.statusCode = 400;
      throw error;
    }

    if (state.currentHalf !== 1) {
      const error = new Error("Second half cannot begin before first half has taken place.");
      error.statusCode = 400;
      throw error;
    }

    const eventMinute = options.minute || Math.max(state.matchMinute, 45);

    const updatedState = await tx.footballMatchState.update({
      where: { id: state.id },
      data: {
        currentHalf: 2,
        matchMinute: Math.max(state.matchMinute, eventMinute)
      }
    });

    const event = await tx.footballEvent.create({
      data: {
        footballMatchStateId: state.id,
        eventType: FootballEventType.KICKOFF,
        minute: eventMinute,
        detail: options.detail || "Second half kickoff"
      }
    });

    const allEvents = await tx.footballEvent.findMany({
      where: { footballMatchStateId: state.id },
      orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
    });

    return {
      matchState: updatedState,
      event,
      events: allEvents
    };
  });
}

/**
 * Records full-time whistle and completes match.
 */
export async function recordFullTimeService(matchId, options = {}, user = null) {
  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Match has already been completed.");
      error.statusCode = 400;
      throw error;
    }

    const state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id }
    });

    if (!state) {
      const error = new Error("Football match state not initialized.");
      error.statusCode = 400;
      throw error;
    }

    let winnerTeamId = null;
    let result = "";

    if (state.homeScore > state.awayScore) {
      winnerTeamId = match.teamAId;
      result = `${match.teamA.name} won ${state.homeScore}-${state.awayScore}`;
    } else if (state.awayScore > state.homeScore) {
      winnerTeamId = match.teamBId;
      result = `${match.teamB.name} won ${state.awayScore}-${state.homeScore}`;
    } else {
      result = `Match drawn ${state.homeScore}-${state.awayScore}`;
    }

    const eventMinute = options.minute || Math.max(state.matchMinute, 90);

    // Update parent Match
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: MatchStatus.COMPLETED,
        winnerTeamId,
        result,
        completedAt: new Date()
      }
    });

    // Update FootballMatchState
    const updatedState = await tx.footballMatchState.update({
      where: { id: state.id },
      data: {
        status: MatchStatus.COMPLETED,
        matchMinute: Math.max(state.matchMinute, eventMinute)
      }
    });

    // Record FULL_TIME event
    const event = await tx.footballEvent.create({
      data: {
        footballMatchStateId: state.id,
        eventType: FootballEventType.FULL_TIME,
        minute: eventMinute,
        detail: options.detail || "Full-time whistle"
      }
    });

    const allEvents = await tx.footballEvent.findMany({
      where: { footballMatchStateId: state.id },
      orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
    });

    return {
      match: {
        id: match.id,
        status: MatchStatus.COMPLETED,
        winnerTeamId,
        result
      },
      matchState: updatedState,
      event,
      events: allEvents
    };
  });
}

/**
 * Undoes the latest football event.
 * Safely decrements score if last event was GOAL.
 * Score is never allowed to become negative.
 */
export async function undoFootballEventService(matchId, user = null) {
  return prisma.$transaction(async (tx) => {
    const match = await validateFootballMatch(matchId, tx);

    const state = await tx.footballMatchState.findUnique({
      where: { matchId: match.id }
    });

    if (!state) {
      const error = new Error("Football match state not initialized.");
      error.statusCode = 400;
      throw error;
    }

    const latestEvent = await tx.footballEvent.findFirst({
      where: { footballMatchStateId: state.id },
      orderBy: { createdAt: "desc" }
    });

    if (!latestEvent) {
      const error = new Error("No football events available to undo.");
      error.statusCode = 400;
      throw error;
    }

    let nextHomeScore = state.homeScore;
    let nextAwayScore = state.awayScore;
    let nextHalf = state.currentHalf;
    let nextStatus = state.status;

    // Rollback specific event mutations
    if (latestEvent.eventType === FootballEventType.GOAL) {
      if (latestEvent.teamId === match.teamAId) {
        nextHomeScore = Math.max(0, state.homeScore - 1);
      } else if (latestEvent.teamId === match.teamBId) {
        nextAwayScore = Math.max(0, state.awayScore - 1);
      }
    } else if (latestEvent.eventType === FootballEventType.FULL_TIME) {
      nextStatus = MatchStatus.LIVE;
      await tx.match.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.LIVE,
          winnerTeamId: null,
          result: null,
          completedAt: null
        }
      });
    } else if (latestEvent.eventType === FootballEventType.KICKOFF && state.currentHalf === 2 && latestEvent.detail?.includes("Second half")) {
      nextHalf = 1;
    }

    // Delete the event
    await tx.footballEvent.delete({
      where: { id: latestEvent.id }
    });

    // Update match state
    const updatedState = await tx.footballMatchState.update({
      where: { id: state.id },
      data: {
        homeScore: nextHomeScore,
        awayScore: nextAwayScore,
        currentHalf: nextHalf,
        status: nextStatus
      }
    });

    const allEvents = await tx.footballEvent.findMany({
      where: { footballMatchStateId: state.id },
      orderBy: [{ minute: "asc" }, { createdAt: "asc" }]
    });

    return {
      matchState: updatedState,
      undoneEvent: latestEvent,
      events: allEvents
    };
  });
}
