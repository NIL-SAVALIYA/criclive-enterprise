import { ZodError } from "zod";

export function validate(schema) {
    return (req, res, next) => {
        console.log("🔍 [BACKEND VALIDATION CHECK]:", {
            path: req.originalUrl,
            method: req.method,
            rawBody: req.body
        });
        try {
            const parsed = schema.parse(req.body);
            console.log("✅ [BACKEND VALIDATION PASSED]:", parsed);
            req.body = parsed;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                console.log("❌ [BACKEND VALIDATION FAILED]:", {
                    rawBody: req.body,
                    errors: error.issues
                });
                return res.status(400).json({
                    success: false,
                    message: "Validation failed.",
                    errors: error.issues.map(issue => ({
                        field: issue.path.join("."),
                        message: issue.message
                    }))
                });
            }

            next(error);
        }
    };
}