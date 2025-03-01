import { Role, User } from "@prisma/client";

// Google OAuth User Data Type
export interface GoogleUser {
  email: string;
  fullName: string;
  googleId: string;
  role?: Role;
}

// JWT Payload Type (for authentication)
export interface JWTPayload {
  id: string;
  email: string;
  role: Role;
}

// API Response Type for Authentication
export interface AuthResponse {
  user: GoogleUser;
  token: string;
}

// ✅ New: Authenticated User Type for Passport & Express
export interface AuthenticatedUser {
  user: User;
  token: string;
}
