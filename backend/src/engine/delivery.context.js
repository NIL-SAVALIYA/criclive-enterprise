/**
 * @file delivery.context.js
 * @description DeliveryContext and Centralized Delivery Validation for CRICLIVE Enterprise.
 */

import { ExtraType } from "../constants/cricket.constants.js";

/**
 * Validates delivery parameters against cricket business rules.
 * @param {Object} data - Raw delivery input parameters
 */
export function validateDeliveryContext(data) {
  const {
    batsmanId,
    strikerId = batsmanId,
    nonStrikerId,
    bowlerId,
    batRuns = 0,
    extraRuns = 0,
    isWicket = false,
    dismissedPlayerId = null
  } = data;

  if (!strikerId) {
    throw new Error("Striker ID is required.");
  }
  if (!nonStrikerId) {
    throw new Error("Non-striker ID is required.");
  }
  if (!bowlerId) {
    throw new Error("Bowler ID is required.");
  }
  if (strikerId === nonStrikerId) {
    throw new Error("Striker and non-striker cannot be the same player.");
  }
  if (bowlerId === strikerId || bowlerId === nonStrikerId) {
    throw new Error("Bowler cannot belong to the active batting partnership.");
  }
  if (typeof batRuns !== "number" || batRuns < 0 || batRuns > 6) {
    throw new Error("Bat runs must be a non-negative integer between 0 and 6.");
  }
  if (typeof extraRuns !== "number" || extraRuns < 0) {
    throw new Error("Extra runs cannot be negative.");
  }
  if (isWicket && dismissedPlayerId) {
    if (dismissedPlayerId !== strikerId && dismissedPlayerId !== nonStrikerId) {
      throw new Error("Dismissed player must be currently batting in the partnership.");
    }
  }
}

/**
 * Constructs an immutable delivery context object.
 * @param {Object} data - Delivery parameters
 * @returns {Object} DeliveryContext
 */
export function createDeliveryContext(data) {
  validateDeliveryContext(data);

  const strikerId = data.strikerId || data.batsmanId;
  
  return Object.freeze({
    inningsId: data.inningsId,
    strikerId,
    batsmanId: strikerId,
    nonStrikerId: data.nonStrikerId,
    bowlerId: data.bowlerId,
    batRuns: Number(data.batRuns) || 0,
    extraRuns: Number(data.extraRuns) || 0,
    extraType: data.extraType || ExtraType.NONE,
    isWicket: Boolean(data.isWicket),
    wicketType: data.isWicket ? data.wicketType : null,
    dismissedPlayerId: data.isWicket ? (data.dismissedPlayerId || strikerId) : null,
    newBatsmanId: data.newBatsmanId || null,
    fielderId: data.fielderId || null,
    commentary: data.commentary || "",
    shotZone: data.shotZone || null,
    shotX: data.shotX || null,
    shotY: data.shotY || null,
    pitchLength: data.pitchLength || null,
    pitchLine: data.pitchLine || null
  });
}
