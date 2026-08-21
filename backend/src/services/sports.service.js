import prisma from "../config/db.js";

/**
 * Retrieves all active sports supported by the platform.
 */
export async function getAllSportsService() {
  const sports = await prisma.sport.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      icon: true,
      isActive: true
    },
    orderBy: { name: "asc" }
  });

  return sports;
}

/**
 * Validates and finds a Sport entity by code (e.g. CRICKET, BADMINTON).
 * Returns the Sport entity if valid, or throws a 400 validation error.
 */
export async function validateAndGetSportByCode(sportCode, db = prisma) {
  if (!sportCode || typeof sportCode !== "string") {
    const error = new Error("Sport code is required.");
    error.statusCode = 400;
    throw error;
  }

  const cleanCode = sportCode.trim().toUpperCase();

  const VALID_SPORT_CODES = ["CRICKET", "BADMINTON"];
  if (!VALID_SPORT_CODES.includes(cleanCode)) {
    const error = new Error(`Invalid or unsupported sport code '${cleanCode}'. Supported sports: CRICKET, BADMINTON.`);
    error.statusCode = 400;
    throw error;
  }

  const sport = await db.sport.findUnique({
    where: { code: cleanCode }
  });

  if (!sport || !sport.isActive) {
    const error = new Error(`Invalid or unsupported sport code '${cleanCode}'. Supported sports: CRICKET, BADMINTON.`);
    error.statusCode = 400;
    throw error;
  }

  return sport;
}
