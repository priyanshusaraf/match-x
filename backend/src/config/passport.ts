import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import prisma from "./database"; // Import Prisma client
import { Role } from "@prisma/client"; // Import Role enum for type safety
import { Request } from "express";
import jwt from "jsonwebtoken";

const dotenv = require("dotenv").config();

// Extend the Request type to include query
interface OAuthRequest extends Request {
  query: {
    state?: string; // The state query parameter for role selection
  };
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
      passReqToCallback: true, // Allows access to the request in the callback
    },
    async (
      req: OAuthRequest,
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: any, user?: Express.User | false) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("Email is required from Google"), false);
        }

        // Debug logs for state and role
        console.log("Raw query state:", req.query.state);

        // Default role to PLAYER unless specified
        let role: Role = Role.PLAYER;

        // Parse and validate the `state` parameter for role selection
        if (req.query.state) {
          try {
            const state = JSON.parse(req.query.state) as { role?: string };
            console.log("Parsed state:", state);

            if (
              state.role &&
              Object.values(Role).includes(state.role as Role)
            ) {
              role = state.role as Role; // Assign role if valid
            } else {
              console.warn(
                "Invalid or missing role in state. Defaulting to PLAYER."
              );
            }
          } catch (error) {
            console.error("Error parsing state parameter:", error);
          }
        }

        console.log("Final role assigned:", role);

        // Check if the user already exists in the tournament system
        let user = await prisma.user.findUnique({ where: { email } });

        // If the user doesn't exist, create a new one with the assigned role
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              fullName: profile.displayName || "No Name",
              authProvider: "GOOGLE",
              role,
              googleId: profile.id,
            },
          });
        } else {
          // If user exists but has no role assigned, update it
          if (!user.role) {
            await prisma.user.update({
              where: { email },
              data: { role },
            });
          }
        }

        // Generate JWT token for API access
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET!,
          { expiresIn: "7d" }
        );

        return done(null, { user, token }); // Return user & token
      } catch (error) {
        console.error("Error in Google OAuth callback:", error);
        return done(error, false);
      }
    }
  )
);

// Serialize user for session handling
passport.serializeUser((user: any, done) => {
  done(null, user.id);
  // Store only user ID
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user || false); // Ensure `false` is returned if no user is found
  } catch (error) {
    done(error, false);
  }
});

export default passport;
