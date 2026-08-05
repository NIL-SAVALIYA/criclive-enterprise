import { z } from "zod";

export const createPlayingXISchema = z.object({
    teamId: z.string().uuid(),

    players: z.array(
        z.object({
            playerId: z.string().uuid(),

            battingOrder: z.number()
                .int()
                .min(1)
                .max(11),

            isCaptain: z.boolean().optional(),

            isWicketKeeper: z.boolean().optional(),

            isSubstitute: z.boolean().optional(),

            isImpactPlayer: z.boolean().optional()
        })
    ).length(11, "Playing XI must contain exactly 11 players.")
});