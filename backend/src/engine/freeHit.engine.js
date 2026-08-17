/**
 * @file freeHit.engine.js
 * @description Centralized Free-Hit State Derivation Engine for CRICLIVE Enterprise.
 */

/**
 * Determines whether the next delivery for an innings is a Free Hit.
 *
 * Cricket Rules:
 * 1. If a delivery was recorded with extraType === "NO_BALL", the NEXT delivery is a Free Hit.
 * 2. If a Free Hit delivery is bowled and it is an illegal delivery (e.g. WIDE or another NO_BALL),
 *    the Free Hit state is NOT consumed and continues for the subsequent delivery.
 * 3. Once a legal delivery is bowled (isLegalDelivery === true), the Free Hit is consumed,
 *    unless that delivery itself was another NO_BALL (which is illegal by definition).
 *
 * @param {Array} recentBalls - List of balls in the innings ordered descending by deliveryNumber (newest first).
 * @returns {boolean} True if the next delivery is a Free Hit, false otherwise.
 */
export function isNextDeliveryFreeHit(recentBalls = []) {
  if (!recentBalls || !Array.isArray(recentBalls) || recentBalls.length === 0) {
    return false;
  }

  for (const ball of recentBalls) {
    if (ball.extraType === "NO_BALL") {
      return true;
    }
    // If the ball was a legal delivery (e.g. NONE, BYE, LEG_BYE), it consumed any pending free hit
    if (ball.isLegalDelivery) {
      return false;
    }
    // If the ball was WIDE (illegal delivery), it does not consume the free hit, so continue checking previous ball
  }

  return false;
}
