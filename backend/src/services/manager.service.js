import {
  createManagerProfile,
  findManagerProfileByUserId,
  findManagerProfileByNormalizedNickname,
  findManagerProfileById,
  updateManagerProfile,
  searchActiveManagers,
  getAssignmentsByManagerProfile
} from "../repositories/manager.repository.js";
import { findUserById } from "../repositories/user.repository.js";

const NICKNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

/**
 * Validate and normalize manager nickname
 */
export function validateAndNormalizeNickname(rawNickname) {
  if (!rawNickname || typeof rawNickname !== "string") {
    const error = new Error("Manager nickname is required.");
    error.statusCode = 400;
    throw error;
  }

  const cleanNickname = rawNickname.trim().replace(/^@/, "");

  if (!NICKNAME_REGEX.test(cleanNickname)) {
    const error = new Error(
      "Nickname must be between 3 and 30 characters and can only contain letters, numbers, underscores, and hyphens."
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    nickname: cleanNickname,
    normalizedNickname: cleanNickname.toLowerCase()
  };
}

/**
 * Check if a nickname is available
 */
export async function checkNicknameAvailabilityService(rawNickname, currentUserId = null) {
  if (!rawNickname || typeof rawNickname !== "string") {
    return {
      available: false,
      message: "Nickname is required."
    };
  }

  const cleanNickname = rawNickname.trim().replace(/^@/, "");

  if (!NICKNAME_REGEX.test(cleanNickname)) {
    return {
      available: false,
      message: "Nickname must be 3-30 characters (letters, numbers, underscores, hyphens only)."
    };
  }

  const normalized = cleanNickname.toLowerCase();
  const existing = await findManagerProfileByNormalizedNickname(normalized);

  if (existing) {
    if (currentUserId && existing.userId === currentUserId) {
      return {
        available: true,
        message: "This is your current nickname."
      };
    }
    return {
      available: false,
      message: "Nickname is already taken. Please choose another."
    };
  }

  return {
    available: true,
    message: "Nickname is available!"
  };
}

/**
 * Register Manager Profile for an existing authenticated user
 */
export async function registerManagerProfileService(userId, data) {
  const user = await findUserById(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const existingProfile = await findManagerProfileByUserId(userId);
  if (existingProfile) {
    const error = new Error("User already has a registered Manager Profile.");
    error.statusCode = 409;
    throw error;
  }

  const { nickname, normalizedNickname } = validateAndNormalizeNickname(data.nickname);

  const nicknameOwner = await findManagerProfileByNormalizedNickname(normalizedNickname);
  if (nicknameOwner) {
    const error = new Error("Nickname is already taken. Please choose a different nickname.");
    error.statusCode = 409;
    throw error;
  }

  const profile = await createManagerProfile({
    userId,
    nickname,
    normalizedNickname,
    displayName: data.displayName?.trim() || `${user.firstName} ${user.lastName}`,
    bio: data.bio?.trim() || null,
    phone: data.phone?.trim() || user.phone || null,
    city: data.city?.trim() || null,
    profileImageUrl: data.profileImageUrl || user.profileImageUrl || null,
    isActive: true
  });

  return {
    id: profile.id,
    userId: profile.userId,
    nickname: profile.nickname,
    displayName: profile.displayName,
    bio: profile.bio,
    phone: profile.phone,
    city: profile.city,
    profileImageUrl: profile.profileImageUrl,
    isActive: profile.isActive,
    createdAt: profile.createdAt,
    user: profile.user
  };
}

/**
 * Get manager profile for current authenticated user
 */
export async function getMyManagerProfileService(userId) {
  const profile = await findManagerProfileByUserId(userId);
  if (!profile) {
    return null;
  }
  return profile;
}

/**
 * Update Manager Profile
 */
export async function updateManagerProfileService(userId, data) {
  const profile = await findManagerProfileByUserId(userId);
  if (!profile) {
    const error = new Error("Manager profile not found.");
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};

  if (data.displayName !== undefined) updateData.displayName = data.displayName?.trim() || null;
  if (data.bio !== undefined) updateData.bio = data.bio?.trim() || null;
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.city !== undefined) updateData.city = data.city?.trim() || null;
  if (data.profileImageUrl !== undefined) updateData.profileImageUrl = data.profileImageUrl?.trim() || null;

  if (data.nickname) {
    const { nickname, normalizedNickname } = validateAndNormalizeNickname(data.nickname);
    if (normalizedNickname !== profile.normalizedNickname) {
      const existing = await findManagerProfileByNormalizedNickname(normalizedNickname);
      if (existing && existing.id !== profile.id) {
        const error = new Error("Nickname is already taken. Please choose another.");
        error.statusCode = 409;
        throw error;
      }
      updateData.nickname = nickname;
      updateData.normalizedNickname = normalizedNickname;
    }
  }

  return updateManagerProfile(profile.id, updateData);
}

/**
 * Toggle Active Status of Manager Profile
 */
export async function toggleManagerActiveStatusService(userId, isActive = null) {
  const profile = await findManagerProfileByUserId(userId);
  if (!profile) {
    const error = new Error("Manager profile not found.");
    error.statusCode = 404;
    throw error;
  }

  const newStatus = isActive !== null ? Boolean(isActive) : !profile.isActive;
  return updateManagerProfile(profile.id, { isActive: newStatus });
}

/**
 * Search active managers (for Tournament Organizers)
 */
export async function searchActiveManagersService(query, limit = 20) {
  return searchActiveManagers(query, limit);
}

/**
 * Get public manager profile by ID or nickname
 */
export async function getManagerProfileByIdOrNicknameService(identifier) {
  if (!identifier) {
    const error = new Error("Identifier is required.");
    error.statusCode = 400;
    throw error;
  }

  let profile = await findManagerProfileById(identifier);
  if (!profile) {
    const normalized = identifier.trim().toLowerCase().replace(/^@/, "");
    profile = await findManagerProfileByNormalizedNickname(normalized);
  }

  if (!profile) {
    const error = new Error("Manager profile not found.");
    error.statusCode = 404;
    throw error;
  }

  return profile;
}

/**
 * Get manager fixtures grouped by status tabs
 */
export async function getManagerFixturesService(userId) {
  const profile = await findManagerProfileByUserId(userId);
  if (!profile) {
    const error = new Error("Manager profile not found. Please register as a manager.");
    error.statusCode = 404;
    throw error;
  }

  const allAssignments = await getAssignmentsByManagerProfile(profile.id);

  const pending = allAssignments.filter((a) => a.status === "PENDING");
  const accepted = allAssignments.filter((a) => a.status === "ACCEPTED");

  const upcoming = accepted.filter((a) => a.match?.status === "UPCOMING");
  const live = accepted.filter((a) => a.match?.status === "LIVE");
  const completed = accepted.filter((a) => a.match?.status === "COMPLETED" || a.match?.status === "CANCELLED");

  return {
    managerProfile: {
      id: profile.id,
      nickname: profile.nickname,
      displayName: profile.displayName,
      isActive: profile.isActive
    },
    counts: {
      pending: pending.length,
      upcoming: upcoming.length,
      live: live.length,
      completed: completed.length,
      total: allAssignments.length
    },
    pending,
    upcoming,
    live,
    completed,
    all: allAssignments
  };
}
