import jwt from "jsonwebtoken";
import env from "../config/env.js"

export function authenticate(req,res, next) {

        try {

            const authHeader = req.headers.authorization;

             if (!authHeader) {
            return res.status(401).json({

                success: false,
                message: "Authorization header is missing."

            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {

            return res.status(401).json({

                success: false,
                message: "Token is missing."

            });
        }

        const decoded = jwt.verify(token, env.JWT_SECRET);

        req.user = decoded;

        next();


        }  catch {

            return res.status(401).json({

                success:false,
                message: "Invalid or expired token."

            })
                
                
        }


}