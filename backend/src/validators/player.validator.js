import { z } from "zod";

export const PlayerTypeEnum = z.enum([
  "BATSMAN",
  "BOWLER",
  "ALL_ROUNDER",
  "WICKET_KEEPER"
]);

export const BattingStyleEnum = z.enum([
  "RIGHT_HAND",
  "LEFT_HAND"
]);

export const BowlingStyleEnum = z.enum([
  "RIGHT_ARM_FAST",
  "LEFT_ARM_FAST",
  "RIGHT_ARM_MEDIUM",
  "LEFT_ARM_MEDIUM",
  "RIGHT_ARM_SPIN",
  "LEFT_ARM_SPIN"
]);

export const createPlayerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters.")
    .max(50, "First name cannot exceed 50 characters."),

  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters.")
    .max(50, "Last name cannot exceed 50 characters."),

  dateOfBirth: z
    .string()
    .datetime({ message: "Invalid date format for Date of Birth." })
    .optional()
    .nullable(),

  jerseyNumber: z
    .number()
    .int("Jersey number must be an integer.")
    .min(0, "Jersey number cannot be negative.")
    .max(999, "Jersey number cannot exceed 999.")
    .optional()
    .nullable(),

  playerType: PlayerTypeEnum,

  battingStyle: BattingStyleEnum.optional().nullable(),

  bowlingStyle: BowlingStyleEnum.optional().nullable(),

  isCaptain: z.boolean().optional().default(false),

  isViceCaptain: z.boolean().optional().default(false),

  teamId: z.string().uuid("Team ID must be a valid UUID.")
});

export const updatePlayerSchema = createPlayerSchema.partial();

export const playerQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  teamId: z.string().optional(),
  playerType: PlayerTypeEnum.optional()
});