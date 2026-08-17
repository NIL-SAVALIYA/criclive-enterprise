import { z } from "zod";

export const MatchStatusEnum = z.enum([
  "UPCOMING",
  "LIVE",
  "COMPLETED",
  "CANCELLED"
]);

export const TossDecisionEnum = z.enum([
  "BAT",
  "BOWL"
]);

export const createMatchSchema = z.object({
  tournamentId: z.string().uuid("Tournament ID must be a valid UUID.").optional(),

  teamAId: z.string().uuid("Team A ID must be a valid UUID."),

  teamBId: z.string().uuid("Team B ID must be a valid UUID."),

  venue: z.string().trim().min(3, "Venue must be at least 3 characters."),

  matchDate: z.string().datetime({ message: "Invalid date format for match date." }),

  tossWinnerId: z.string().uuid("Toss winner ID must be a valid UUID.").optional().nullable(),

  tossDecision: TossDecisionEnum.optional().nullable(),

  scorerId: z.string().uuid("Scorer ID must be a valid UUID.").optional().nullable(),

  status: MatchStatusEnum.optional().default("UPCOMING")
}).refine(
  (data) => data.teamAId !== data.teamBId,
  {
    message: "Team A and Team B cannot be the same.",
    path: ["teamBId"]
  }
);

export const updateMatchSchema = z.object({
  tournamentId: z.string().uuid().optional(),

  teamAId: z.string().uuid().optional(),

  teamBId: z.string().uuid().optional(),

  venue: z.string().trim().min(3).optional(),

  matchDate: z.string().datetime().optional(),

  tossWinnerId: z.string().uuid().optional().nullable(),

  tossDecision: TossDecisionEnum.optional().nullable(),

  scorerId: z.string().uuid().optional().nullable(),

  status: MatchStatusEnum.optional()
});

export const matchQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  tournamentId: z.string().optional(),
  status: MatchStatusEnum.optional()
});