import { z } from "zod";
import { ExtraType } from "@prisma/client";

export const createBallSchema = z.object({

    inningsId: z.string().uuid(),

    batsmanId: z.string().uuid(),

    nonStrikerId: z.string().uuid(),

    bowlerId: z.string().uuid(),


    batRuns: z.number().int().min(0).max(6).default(0),

    extraRuns: z.number().int().min(0).max(7).default(0),

    extraType: z
    .nativeEnum(ExtraType)
    .default(ExtraType.NONE),

    /*extraType: z
        .enum([
            "BYE",
            "LEG_BYE",
            "WIDE",
            "NO_BALL"
        ])
        .nullable()
        .default(null),
    */
    isWicket: z.boolean().default(false),

    wicketType: z
        .enum([
            "BOWLED",
            "CAUGHT",
            "LBW",
            "RUN_OUT",
            "STUMPED",
            "HIT_WICKET",
            "OBSTRUCTING_FIELD",
            "HIT_BALL_TWICE",
            "TIMED_OUT",
            "RETIRED_OUT"
        ])
        .nullable()
        .default(null),

    dismissedPlayerId: z.string().uuid().nullable().default(null),

    newBatsmanId: z.string().uuid().nullable().default(null),

    fielderId: z.string().uuid().nullable().default(null),
    
    commentary: z.string().trim().max(500).default("")
}).superRefine((data, ctx) => {

    if (data.extraRuns > 0 && data.extraType === ExtraType.NONE) {
        ctx.addIssue({
            code: "custom",
            path: ["extraType"],
            message: "extraType is required when extraRuns is greater than 0."
        });
    }

    if (data.isWicket && !data.wicketType) {
        ctx.addIssue({
            code: "custom",
            path: ["wicketType"],
            message: "wicketType is required when isWicket is true."
        });
    }
});