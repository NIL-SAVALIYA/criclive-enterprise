import {
  createTeamSchema,
  updateTeamSchema,
  teamQuerySchema
} from "../validators/team.validator.js";
import {
  createTeamService,
  getAllTeamsService,
  getTeamByIdService,
  updateTeamService,
  deleteTeamService
} from "../services/team.service.js";
import { ZodError } from "zod";

function formatZodErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));
}

export async function create(req, res) {
  try {
    const data = createTeamSchema.parse(req.body);
    const team = await createTeamService(data);

    return res.status(201).json({
      success: true,
      message: "Team created successfully.",
      data: team
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
      message: error.message || "Failed to create team."
    });
  }
}

export async function getAll(req, res) {
  try {
    const params = teamQuerySchema.parse(req.query);
    const result = await getAllTeamsService(params);

    const data = Array.isArray(result) ? result : result.teams;
    const pagination = result.pagination || undefined;

    return res.status(200).json({
      success: true,
      data,
      ...(pagination && { pagination })
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch teams."
    });
  }
}

export async function getOne(req, res) {
  try {
    const team = await getTeamByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      data: team
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Team not found."
    });
  }
}

export async function update(req, res) {
  try {
    const data = updateTeamSchema.parse(req.body);
    const currentUser = req.user ? { userId: req.user.userId, role: req.user.role } : null;
    const team = await updateTeamService(req.params.id, data, currentUser);

    return res.status(200).json({
      success: true,
      message: "Team updated successfully.",
      data: team
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
      message: error.message || "Failed to update team."
    });
  }
}

export async function remove(req, res) {
  try {
    await deleteTeamService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Team deleted successfully."
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete team."
    });
  }
}