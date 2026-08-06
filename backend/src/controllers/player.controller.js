import {
  createPlayerSchema,
  updatePlayerSchema,
  playerQuerySchema
} from "../validators/player.validator.js";
import {
  createPlayerService,
  getAllPlayersService,
  getPlayerByIdService,
  updatePlayerService,
  deletePlayerService
} from "../services/player.service.js";
import { ZodError } from "zod";

function formatZodErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));
}

export async function create(req, res) {
  try {
    const data = createPlayerSchema.parse(req.body);
    const player = await createPlayerService(data);

    return res.status(201).json({
      success: true,
      message: "Player created successfully.",
      data: player
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
      message: error.message || "Failed to create player."
    });
  }
}

export async function getAll(req, res) {
  try {
    const params = playerQuerySchema.parse(req.query);
    const result = await getAllPlayersService(params);

    const data = Array.isArray(result) ? result : result.players;
    const pagination = result.pagination || undefined;

    return res.status(200).json({
      success: true,
      data,
      ...(pagination && { pagination })
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch players."
    });
  }
}

export async function getOne(req, res) {
  try {
    const player = await getPlayerByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      data: player
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Player not found."
    });
  }
}

export async function update(req, res) {
  try {
    const data = updatePlayerSchema.parse(req.body);
    const currentUser = req.user ? { userId: req.user.userId, role: req.user.role } : null;
    const player = await updatePlayerService(req.params.id, data, currentUser);

    return res.status(200).json({
      success: true,
      message: "Player updated successfully.",
      data: player
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
      message: error.message || "Failed to update player."
    });
  }
}

export async function remove(req, res) {
  try {
    await deletePlayerService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Player deleted successfully."
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete player."
    });
  }
}