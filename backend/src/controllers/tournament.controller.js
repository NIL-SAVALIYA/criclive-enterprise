import {
  createTournamentSchema,
  updateTournamentSchema,
  tournamentQuerySchema
} from "../validators/tournament.validator.js";
import {
  createTournamentService,
  getAllTournamentsService,
  getTournamentByIdService,
  updateTournamentService,
  deleteTournamentService
} from "../services/tournament.service.js";
import { ZodError } from "zod";

function formatZodErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));
}

export async function create(req, res) {
  try {
    const data = createTournamentSchema.parse(req.body);
    const tournament = await createTournamentService(data);

    return res.status(201).json({
      success: true,
      message: "Tournament created successfully.",
      data: tournament
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
      message: error.message || "Failed to create tournament."
    });
  }
}

export async function getAll(req, res) {
  try {
    const params = tournamentQuerySchema.parse(req.query);
    const result = await getAllTournamentsService(params);

    // If result has pagination wrapper, return tournaments as data and pagination meta
    const data = Array.isArray(result) ? result : result.tournaments;
    const pagination = result.pagination || undefined;

    return res.status(200).json({
      success: true,
      data,
      ...(pagination && { pagination })
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tournaments."
    });
  }
}

export async function getOne(req, res) {
  try {
    const tournament = await getTournamentByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Tournament not found."
    });
  }
}

export async function update(req, res) {
  try {
    const data = updateTournamentSchema.parse(req.body);
    const tournament = await updateTournamentService(req.params.id, data);

    return res.status(200).json({
      success: true,
      message: "Tournament updated successfully.",
      data: tournament
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
      message: error.message || "Failed to update tournament."
    });
  }
}

export async function remove(req, res) {
  try {
    await deleteTournamentService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Tournament deleted successfully."
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete tournament."
    });
  }
}