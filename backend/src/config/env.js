import dotenv from "dotenv";

dotenv.config();

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET must be defined in production environment!");
}

const env = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || "development-secret",
  NODE_ENV: process.env.NODE_ENV || "development",
  CAPTCHA_SECRET_KEY: process.env.CAPTCHA_SECRET_KEY || "1x0000000000000000000000000000000AA",
  CAPTCHA_SITE_KEY: process.env.CAPTCHA_SITE_KEY || "1x00000000000000000000AA",
};

export default env;