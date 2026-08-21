import {
  registerManagerProfileService,
  getMyManagerProfileService,
  updateManagerProfileService,
  toggleManagerActiveStatusService,
  checkNicknameAvailabilityService,
  searchActiveManagersService,
  getManagerProfileByIdOrNicknameService,
  getManagerFixturesService
} from "../services/manager.service.js";
import { registerManagerSchema, updateManagerSchema } from "../validators/manager.validator.js";
import { ZodError } from "zod";

function formatZodErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));
}

export async function registerManager(req, res) {
  try {
    const data = registerManagerSchema.parse(req.body);
    const result = await registerManagerProfileService(req.user.userId, data);

    return res.status(201).json({
      success: true,
      message: "Manager profile registered successfully.",
      data: result
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: formatZodErrors(error)
      });
    }

    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to register manager profile."
    });
  }
}

export async function getMyProfile(req, res) {
  try {
    const profile = await getMyManagerProfileService(req.user.userId);

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get manager profile."
    });
  }
}

export async function updateMyProfile(req, res) {
  try {
    const data = updateManagerSchema.parse(req.body);
    const updated = await updateManagerProfileService(req.user.userId, data);

    return res.status(200).json({
      success: true,
      message: "Manager profile updated successfully.",
      data: updated
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: formatZodErrors(error)
      });
    }

    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update manager profile."
    });
  }
}

export async function toggleActive(req, res) {
  try {
    const { isActive } = req.body;
    const updated = await toggleManagerActiveStatusService(req.user.userId, isActive);

    return res.status(200).json({
      success: true,
      message: `Manager profile ${updated.isActive ? "activated" : "deactivated"} successfully.`,
      data: updated
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to toggle active status."
    });
  }
}

export async function checkNickname(req, res) {
  try {
    const { nickname } = req.query;
    const currentUserId = req.user ? req.user.userId : null;
    const result = await checkNicknameAvailabilityService(nickname, currentUserId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to check nickname."
    });
  }
}

export async function searchManagers(req, res) {
  try {
    const { query, limit } = req.query;
    const managers = await searchActiveManagersService(query, limit ? parseInt(limit, 10) : 20);

    return res.status(200).json({
      success: true,
      data: managers
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to search managers."
    });
  }
}

export async function getPublicProfile(req, res) {
  try {
    const { identifier } = req.params;
    const profile = await getManagerProfileByIdOrNicknameService(identifier);

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Manager profile not found."
    });
  }
}

export async function getMyFixtures(req, res) {
  try {
    const fixtures = await getManagerFixturesService(req.user.userId);

    return res.status(200).json({
      success: true,
      data: fixtures
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch manager fixtures."
    });
  }
}
