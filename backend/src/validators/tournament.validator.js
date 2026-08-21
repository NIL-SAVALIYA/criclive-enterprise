import { z } from "zod";

export const TournamentFormatEnum = z.enum([
  "LEAGUE",
  "KNOCKOUT",
  "ROUND_ROBIN",
  "HYBRID"
]);

export const TournamentStatusEnum = z.enum([
  "UPCOMING",
  "LIVE",
  "COMPLETED",
  "CANCELLED"
]);

export const createTournamentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Tournament name must be at least 3 characters.")
    .max(100, "Tournament name cannot exceed 100 characters."),

  description: z.string().trim().optional(),

  format: TournamentFormatEnum,

  startDate: z.string().datetime({ message: "Invalid start date format." }),

  endDate: z.string().datetime({ message: "Invalid end date format." }),

  sport: z.string().trim().optional(),

  sportCode: z.string().trim().optional(),

  status: TournamentStatusEnum.optional().default("UPCOMING")
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: "End date must be on or after start date.",
    path: ["endDate"]
  }
);

export const updateTournamentSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),

  description: z.string().trim().optional(),

  format: TournamentFormatEnum.optional(),

  startDate: z.string().datetime().optional(),

  endDate: z.string().datetime().optional(),

  sport: z.string().trim().optional(),

  sportCode: z.string().trim().optional(),

  status: TournamentStatusEnum.optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: "End date must be on or after start date.",
    path: ["endDate"]
  }
);

export const tournamentQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  search: z.string().optional(),
  status: TournamentStatusEnum.optional(),
  format: TournamentFormatEnum.optional(),
  sport: z.string().optional()
});