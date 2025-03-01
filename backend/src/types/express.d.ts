import { User as PrismaUser, Role } from "@prisma/client";
import { Request } from "express";

// Extend Express' built-in `User` type
declare global {
  namespace Express {
    interface User extends PrismaUser {}
  }
}

// Custom Request Type with User (for protected routes)
export interface AuthenticatedRequest extends Request {
  user?: PrismaUser;
}
