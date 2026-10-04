import { z } from "zod";

const nicknameRegex = /^[a-zA-Z0-9_-]{3,30}$/;

export const registerManagerSchema = z.object({
  nickname: z
    .string({ required_error: "Nickname is required." })
    .trim()
    .transform((val) => val.replace(/^@/, ""))
    .refine((val) => nicknameRegex.test(val), {
      message: "Nickname must be between 3 and 30 characters (letters, numbers, underscores, hyphens only)."
    }),
  displayName: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(20).optional(),
  city: z.string().trim().max(100).optional(),
  profileImageUrl: z.string().trim().url().optional().or(z.literal(""))
});

export const updateManagerSchema = z.object({
  nickname: z
    .string()
    .trim()
    .transform((val) => val.replace(/^@/, ""))
    .refine((val) => nicknameRegex.test(val), {
      message: "Nickname must be between 3 and 30 characters (letters, numbers, underscores, hyphens only)."
    })
    .optional(),
  displayName: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(20).optional(),
  city: z.string().trim().max(100).optional(),
  profileImageUrl: z.string().trim().url().optional().or(z.literal(""))
});

export const createAssignmentSchema = z.object({
  teamId: z.string({ required_error: "Team ID is required." }).min(1),
  managerIdentifier: z.string({ required_error: "Manager identifier (ID or nickname) is required." }).min(1)
});

export const declineAssignmentSchema = z.object({
  reason: z.string().trim().max(300).optional()
});

export const revokeAssignmentSchema = z.object({
  reason: z.string().trim().max(300).optional()
});
