import { registerSchema, loginSchema } from "../validators/auth.validator.js";
import { registerUser, loginUser, getProfile } from "../services/auth.service.js";
import { editUser } from "../services/user.service.js";
import { verifyCaptchaToken } from "../services/captcha.service.js";
import { ZodError } from "zod";

function formatZodErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));
}

export async function register(req, res) {
  try {
    const data = registerSchema.parse(req.body);
    const user = await registerUser(data);

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: user
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
      message: error.message || "Internal Server Error"
    });
  }
}

export async function login(req, res) {
  try {
    const data = loginSchema.parse(req.body);
    const clientMeta = {
      ip: req.ip || req.headers["x-forwarded-for"],
      userAgent: req.headers["user-agent"]
    };

    // Verify Cloudflare Turnstile CAPTCHA token before any authentication processing
    const captchaResult = await verifyCaptchaToken(data.captchaToken, clientMeta.ip);
    if (!captchaResult.success) {
      return res.status(400).json({
        success: false,
        message: captchaResult.message || "Please complete the human verification."
      });
    }

    const result = await loginUser(data, clientMeta);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
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

    const statusCode = error.statusCode || 401;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Invalid credentials."
    });
  }
}

export async function profile(req, res) {
  try {
    const user = await getProfile(req.user.userId);

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "User not found."
    });
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, phone, profileImageUrl } = req.body;
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone.trim() || null;
    if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl.trim() || null;

    await editUser(userId, updateData);
    const updated = await getProfile(userId);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updated
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update profile."
    });
  }
}
