import { getMatchById, updateMatch } from "../repositories/match.repository.js";
import { getPlayingXIByMatch } from "../repositories/playingXI.repository.js";
import { createInnings } from "../repositories/innings.repository.js";

export async function startMatch(matchId) {

    const match = await getMatchById(matchId);

    if (!match) {
        throw new Error("Match not found");
    }

    if (match.status !== "UPCOMING") {
        throw new Error("Match has already started or completed");
    }

    if (!match.tossWinnerId || !match.tossDecision) {
        throw new Error("Toss has not been recorded");
    }

    const playingXI = await getPlayingXIByMatch(matchId);

    const teamAPlayers = playingXI.filter(
        player => player.teamId === match.teamAId
    );

    const teamBPlayers = playingXI.filter(
        player => player.teamId === match.teamBId
    );

    if (teamAPlayers.length !== 11 || teamBPlayers.length !== 11) {
        throw new Error("Both teams must have exactly 11 players");
    }

    let battingTeamId;
    let bowlingTeamId;

    if (match.tossDecision === "BAT") {
        battingTeamId = match.tossWinnerId;
        bowlingTeamId =
            match.tossWinnerId === match.teamAId
                ? match.teamBId
                : match.teamAId;
    } else {
        bowlingTeamId = match.tossWinnerId;
        battingTeamId =
            match.tossWinnerId === match.teamAId
                ? match.teamBId
                : match.teamAId;
    }

    await createInnings({
        matchId,
        inningsNumber: 1,
        battingTeamId,
        bowlingTeamId,
        status: "LIVE"
    });

    return await updateMatch(matchId, {
        status: "LIVE"
    });
}