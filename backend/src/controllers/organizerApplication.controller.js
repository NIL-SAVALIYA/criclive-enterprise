import {
  createOrganizerApplicationSchema,
  updateApplicationStatusSchema,
  queryOrganizerApplicationsSchema
} from "../validators/organizerApplication.validator.js";
import {
  submitOrganizerApplicationService,
  getMyApplicationsService,
  getAllOrganizerApplicationsService,
  getOrganizerApplicationByIdService,
  reviewOrganizerApplicationService,
  suspendOrganizerService
} from "../services/organizerApplication.service.js";
import { ZodError } from "zod";

function formatZodErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));
}

/**
 * Validates organizer details and automatically activates ORGANIZER role for the logged-in user.
 */
export async function submitApplication(req, res) {
  try {
    const data = createOrganizerApplicationSchema.parse(req.body);
    const result = await submitOrganizerApplicationService(req.user.userId, data);

    return res.status(201).json({
      success: true,
      message: "Organizer profile validated. Your account is now upgraded to ORGANIZER.",
      data: result.application,
      role: result.role,
      user: result.user
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed. Incomplete or invalid organizer information.",
        errors: formatZodErrors(error)
      });
    }

    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to activate organizer status."
    });
  }
}

/**
 * Suspends an organizer and revokes organizer role (Admin only).
 */
export async function suspendOrganizer(req, res) {
  try {
    const reason = req.body.reason || "Administrative policy violation";
    const result = await suspendOrganizerService(req.params.userId, reason, req.user);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.user
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to suspend organizer."
    });
  }
}

/**
 * Retrieves applications submitted by the logged-in user.
 */
export async function getMyApplications(req, res) {
  try {
    const applications = await getMyApplicationsService(req.user.userId);
    return res.status(200).json({
      success: true,
      data: applications
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch your applications."
    });
  }
}

/**
 * Retrieves all organizer applications (Admin only).
 */
export async function getAllApplications(req, res) {
  try {
    const query = queryOrganizerApplicationsSchema.parse(req.query);
    const result = await getAllOrganizerApplicationsService(query);

    return res.status(200).json({
      success: true,
      data: result.applications,
      pagination: result.pagination
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: formatZodErrors(error)
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch organizer applications."
    });
  }
}

/**
 * Retrieves a single organizer application by ID.
 */
export async function getApplicationById(req, res) {
  try {
    const application = await getOrganizerApplicationByIdService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Organizer application not found."
    });
  }
}

/**
 * Reviews (Approve/Reject) an application manually (Admin only).
 */
export async function reviewApplication(req, res) {
  try {
    const data = updateApplicationStatusSchema.parse(req.body);
    const updated = await reviewOrganizerApplicationService(req.params.id, data, req.user);

    return res.status(200).json({
      success: true,
      message: `Organizer application ${data.status.toLowerCase()} successfully.`,
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

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update organizer application."
    });
  }
}
