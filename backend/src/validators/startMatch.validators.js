import { z } from "zod";

export const startMatchSchema = z.object({
    strikerId: z.string().uuid("Invalid Striker ID"),
    nonStrikerId: z.string().uuid("Invalid Non-Striker ID"),
    bowlerId: z.string().uuid("Invalid Bowler ID")
}).refine(data => data.strikerId !== data.nonStrikerId, {
    message: "Striker and Non-Striker cannot be the same player",
    path: ["nonStrikerId"]
});