import { z } from "zod";

export const createOrganizerApplicationSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name cannot exceed 100 characters"),

  organizationType: z
    .string()
    .trim()
    .max(50, "Organization type cannot exceed 50 characters")
    .optional(),

  phone: z
    .string()
    .trim()
    .max(20, "Phone number cannot exceed 20 characters")
    .optional(),

  city: z
    .string()
    .trim()
    .max(50, "City name cannot exceed 50 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"], {
    errorMap: () => ({ message: "Status must be either APPROVED or REJECTED" })
  }),

  rejectionReason: z
    .string()
    .trim()
    .max(300, "Rejection reason cannot exceed 300 characters")
    .optional()
}).refine(
  (data) => {
    if (data.status === "REJECTED" && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Rejection reason is required when rejecting an application",
    path: ["rejectionReason"]
  }
);

export const queryOrganizerApplicationsSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});
