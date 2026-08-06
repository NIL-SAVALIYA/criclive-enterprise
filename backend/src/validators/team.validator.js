import { z } from "zod";

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Team name must be at least 3 characters.")
    .max(100, "Team name cannot exceed 100 characters."),

  shortName: z
    .string()
    .trim()
    .min(2, "Short name must be at least 2 characters.")
    .max(5, "Short name cannot exceed 5 characters.")
    .toUpperCase(),

  city: z
    .string()
    .trim()
    .min(2, "City name is required."),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters.")
    .optional()
    .nullable(),

  logoUrl: z
    .string()
    .trim()
    .url("Logo URL must be a valid URL format.")
    .optional()
    .nullable()
    .or(z.literal("")),

  managerId: z
    .string()
    .uuid("Manager ID must be a valid UUID.")
    .optional()
    .nullable()
    .or(z.literal(""))
});

export const updateTeamSchema = createTeamSchema.partial();

export const teamQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  city: z.string().optional()
});