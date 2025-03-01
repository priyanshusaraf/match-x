const express = require("express");
import passport from "../config/passport"; // ✅ Import Passport
import jwt from "jsonwebtoken";
const dotenv = require("dotenv").config();
import { AuthenticatedRequest } from "../types/express"; // ✅ Import custom request type
import { AuthenticatedUser } from "../types/auth"; // ✅ Import new custom user type
import cookieParser from "cookie-parser";

dotenv.config();
const router = express.Router();

// Middleware for parsing cookies
router.use(cookieParser());

/**
 * 🔹 Google OAuth Login Route
 * Redirects users to Google's OAuth login page.
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * 🔹 Google OAuth Callback Route
 * Handles the response after Google authentication.
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.redirect("/auth/failure");
    }

    // ✅ Ensure correct typing
    const { user, token } = req.user as AuthenticatedUser;

    // Store JWT in an HTTP-only cookie (safer alternative to localStorage)
    res.cookie("token", token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === "production", // Only secure in production
      sameSite: "strict", // Prevents CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // Expires in 7 days
    });

    // Redirect user to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth?token=${token}`);
  }
);

/**
 * 🔹 Logout Route
 * Clears the user session and logs out.
 */
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error logging out" });
    }

    res.clearCookie("token"); // Clear authentication cookie
    res.json({ success: true, message: "Logged out successfully" });
  });
});

/**
 * 🔹 Failure Route
 * Redirects users if authentication fails.
 */
router.get("/failure", (req, res) => {
  res
    .status(401)
    .json({ success: false, message: "Google authentication failed" });
});

export default router;
