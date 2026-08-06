import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import {
  findUserByEmail,
  findRoleByName,
  createUser,
  findUserById
} from "../repositories/user.repository.js";
import { recordLoginAttempt } from "../utils/auditLogger.js";

export async function registerUser(userData) {
  const { firstName, lastName, email, password, role } = userData;

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error("Email already registered.");
    error.statusCode = 409;
    throw error;
  }

  const roleData = await findRoleByName(role);
  if (!roleData) {
    const error = new Error("Invalid role.");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await createUser({
    firstName,
    lastName,
    email: normalizedEmail,
    password: hashedPassword,
    roleId: roleData.id
  });

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: roleData.name
  };
}

export async function loginUser(loginData, clientMeta = {}) {
  const { email, password } = loginData;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    await recordLoginAttempt({
      email: normalizedEmail,
      ip: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      success: false,
      failureReason: "User not found"
    });
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  // TASK 5: User Status Validation
  if (user.isActive === false) {
    await recordLoginAttempt({
      userId: user.id,
      email: normalizedEmail,
      ip: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      success: false,
      failureReason: "Account disabled"
    });
    const error = new Error("Account is disabled. Please contact an administrator.");
    error.statusCode = 403;
    throw error;
  }

  // TODO: Future enhancement - check user.isDeleted
  // TODO: Future enhancement - check user.isBlocked

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    await recordLoginAttempt({
      userId: user.id,
      email: normalizedEmail,
      ip: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      success: false,
      failureReason: "Invalid password"
    });
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  // TASK 7: JWT Generation (Preserves exact payload: { userId, role })
  // TODO: Future enhancement - Generate Refresh Token & save to DB / HTTP-Only Cookie
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role.name
    },
    env.JWT_SECRET,
    {
      expiresIn: "7d",
      issuer: "criclive-api",
      audience: "criclive-app"
    }
  );

  await recordLoginAttempt({
    userId: user.id,
    email: normalizedEmail,
    ip: clientMeta.ip,
    userAgent: clientMeta.userAgent,
    success: true
  });

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role.name
    }
  };
}

export async function getProfile(userId) {
  const user = await findUserById(userId);

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  if (user.isActive === false) {
    const error = new Error("Account is disabled.");
    error.statusCode = 403;
    throw error;
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role.name
  };
}