import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWTPayload } from "../types/auth";

const dotenv = require("dotenv").config();

// Extend Express Request type to include `user`
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * 🔹 Middleware to protect routes using JWT authentication.
 */
export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = decoded;
    next(); // Proceed to next middleware or route handler
  } catch (error) {
    return res
      .status(403)
      .json({ success: false, message: "Forbidden: Invalid token" });
  }
};
