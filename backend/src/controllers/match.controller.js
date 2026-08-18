import {
  createMatchSchema,
  updateMatchSchema,
  matchQuerySchema
} from "../validators/match.validator.js";
import {
  createMatchService,
  getAllMatchesService,
  getMatchByIdService,
  updateMatchService,
  deleteMatchService,
  generateScoringTokenService,
  revokeScoringTokenService,
  getScoringTokenService,
  getMatchByScoringTokenService
} from "../services/match.service.js";
import { ZodError } from "zod";

function formatZodErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));
}

export async function create(req, res) {
  try {
    const data = createMatchSchema.parse(req.body);
    const match = await createMatchService(data, req.user);

    return res.status(201).json({
      success: true,
      message: "Match created successfully.",
      data: match
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
      message: error.message || "Failed to create match."
    });
  }
}

export async function getAll(req, res) {
  try {
    const params = matchQuerySchema.parse(req.query);
    const result = await getAllMatchesService(params);

    const data = Array.isArray(result) ? result : result.matches;
    const pagination = result.pagination || undefined;

    return res.status(200).json({
      success: true,
      data,
      ...(pagination && { pagination })
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch matches."
    });
  }
}

export async function getOne(req, res) {
  try {
    const match = await getMatchByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Match not found."
    });
  }
}

export async function update(req, res) {
  try {
    const data = updateMatchSchema.parse(req.body);
    const match = await updateMatchService(req.params.id, data, req.user);

    return res.status(200).json({
      success: true,
      message: "Match updated successfully.",
      data: match
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
      message: error.message || "Failed to update match."
    });
  }
}

export async function remove(req, res) {
  try {
    await deleteMatchService(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: "Match deleted successfully."
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete match."
    });
  }
}

export async function generateScoringToken(req, res) {
  try {
    const { id } = req.params;
    const result = await generateScoringTokenService(id, req.user);

    return res.status(200).json({
      success: true,
      message: "Scoring access token generated successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to generate scoring token."
    });
  }
}

export async function revokeScoringToken(req, res) {
  try {
    const { id } = req.params;
    const result = await revokeScoringTokenService(id, req.user);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to revoke scoring token."
    });
  }
}

export async function getScoringToken(req, res) {
  try {
    const { id } = req.params;
    const result = await getScoringTokenService(id, req.user);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get scoring token."
    });
  }
}

export async function getScoreSessionByToken(req, res) {
  try {
    const { token } = req.params;
    const result = await getMatchByScoringTokenService(token);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Invalid or expired scoring link."
    });
  }
}