import {
  requestManagerAssignmentService,
  acceptManagerAssignmentService,
  declineManagerAssignmentService,
  cancelManagerAssignmentService,
  revokeManagerAssignmentService,
  getMatchManagerAssignmentsService
} from "../services/managerAssignment.service.js";
import {
  createAssignmentSchema,
  declineAssignmentSchema,
  revokeAssignmentSchema
} from "../validators/manager.validator.js";
import { ZodError } from "zod";

function formatZodErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));
}

export async function requestAssignment(req, res) {
  try {
    const { matchId } = req.params;
    const { teamId, managerIdentifier } = createAssignmentSchema.parse(req.body);

    const assignment = await requestManagerAssignmentService(
      matchId,
      teamId,
      managerIdentifier,
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Manager assignment request created successfully.",
      data: assignment
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
      message: error.message || "Failed to create manager assignment request."
    });
  }
}

export async function getMatchAssignments(req, res) {
  try {
    const { matchId } = req.params;
    const assignments = await getMatchManagerAssignmentsService(matchId);

    return res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get manager assignments."
    });
  }
}

export async function acceptAssignment(req, res) {
  try {
    const { id } = req.params;
    const updated = await acceptManagerAssignmentService(id, req.user);

    return res.status(200).json({
      success: true,
      message: "Manager assignment accepted successfully.",
      data: updated
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to accept manager assignment."
    });
  }
}

export async function declineAssignment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = declineAssignmentSchema.parse(req.body || {});
    const updated = await declineManagerAssignmentService(id, req.user, reason);

    return res.status(200).json({
      success: true,
      message: "Manager assignment declined.",
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
      message: error.message || "Failed to decline manager assignment."
    });
  }
}

export async function cancelAssignment(req, res) {
  try {
    const { id } = req.params;
    const updated = await cancelManagerAssignmentService(id, req.user);

    return res.status(200).json({
      success: true,
      message: "Manager assignment request cancelled.",
      data: updated
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to cancel manager assignment request."
    });
  }
}

export async function revokeAssignment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = revokeAssignmentSchema.parse(req.body || {});
    const updated = await revokeManagerAssignmentService(id, req.user, reason);

    return res.status(200).json({
      success: true,
      message: "Manager assignment revoked.",
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
      message: error.message || "Failed to revoke manager assignment."
    });
  }
}
