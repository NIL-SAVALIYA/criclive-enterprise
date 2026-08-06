/**
 * @file cricket.constants.js
 * @description Centralized constants for the CRICLIVE Enterprise scoring engine.
 */

import { ExtraType, WicketType, MatchStatus, InningsStatus, MatchResultType } from "@prisma/client";

export const BALLS_PER_OVER = 6;
export const MAX_PLAYERS = 11;
export const MAX_WICKETS = 10;
export const SUPER_OVER_BALLS = 6;
export const POWERPLAY_OVERS = 6;
export const DEFAULT_MAX_OVERS = 20;

export { ExtraType, WicketType, MatchStatus, InningsStatus, MatchResultType };
