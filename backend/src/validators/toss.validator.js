import { z } from "zod";

export const createTossSchema = z.object({
  winnerTeamId: z.string().uuid("Invalid winner team ID"),
  decision: z.enum(["BAT", "BOWL"]),
});