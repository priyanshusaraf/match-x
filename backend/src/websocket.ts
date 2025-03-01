import { Server } from "socket.io";
import prisma from "./config/database"; // Import Prisma client
import jwt from "jsonwebtoken";

export default function configureWebSockets(io: Server) {
  // ✅ Authenticate users when they connect
  io.use((socket, next) => {
    const token = socket.handshake.auth.token; // Get JWT from client

    if (!token) {
      console.warn("⚠️ WebSocket authentication failed: No token provided.");
      return next(new Error("Authentication error: No token provided."));
    }

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!);
      socket.user = user; // Attach user data to socket
      next();
    } catch (error) {
      console.warn("⚠️ WebSocket authentication failed: Invalid token.");
      return next(new Error("Authentication error: Invalid token."));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `🔥 New WebSocket Connection: ${socket.id}, User: ${socket.user.email}`
    );

    // ✅ Allow users to join a match room
    socket.on("join-match", (matchId) => {
      socket.join(matchId);
      console.log(`📌 User ${socket.user.email} joined match room: ${matchId}`);
    });

    // ✅ Allow users to leave a match room
    socket.on("leave-match", (matchId) => {
      socket.leave(matchId);
      console.log(`❌ User ${socket.user.email} left match room: ${matchId}`);
    });

    // ✅ Handle Match Started Event
    socket.on("match-started", async (data) => {
      const { matchId, refereeId } = data;

      if (!matchId || !refereeId) {
        return socket.emit("error", { message: "Invalid match start data." });
      }

      try {
        const match = await prisma.match.findUnique({ where: { id: matchId } });

        if (!match) {
          return socket.emit("error", { message: "Match not found." });
        }

        if (
          socket.user.role !== "REFEREE" ||
          match.refereeId !== socket.user.id
        ) {
          return socket.emit("error", {
            message: "Unauthorized: Only assigned referees can start matches.",
          });
        }

        await prisma.match.update({
          where: { id: matchId },
          data: { status: "IN_PROGRESS" },
        });

        console.log(`✅ Match Started: Match ${matchId}`);
        io.to(matchId).emit("match-started", { matchId });
      } catch (error) {
        console.error("Error starting match:", error);
        socket.emit("error", { message: "Failed to start match." });
      }
    });

    // ✅ Handle Match Ended Event
    socket.on("match-ended", async (data) => {
      const { matchId, refereeId, winnerId } = data;

      if (!matchId || !refereeId || !winnerId) {
        return socket.emit("error", { message: "Invalid match end data." });
      }

      try {
        const match = await prisma.match.findUnique({ where: { id: matchId } });

        if (!match) {
          return socket.emit("error", { message: "Match not found." });
        }

        if (
          socket.user.role !== "REFEREE" ||
          match.refereeId !== socket.user.id
        ) {
          return socket.emit("error", {
            message: "Unauthorized: Only assigned referees can end matches.",
          });
        }

        await prisma.match.update({
          where: { id: matchId },
          data: { status: "COMPLETED", winnerId },
        });

        console.log(`✅ Match Ended: Match ${matchId}, Winner: ${winnerId}`);

        // ✅ Update player stats (Wins & Losses)
        await prisma.user.update({
          where: { id: winnerId },
          data: { wins: { increment: 1 }, points: { increment: 3 } }, // 3 points for a win
        });

        const loserId =
          match.playerAId === winnerId ? match.playerBId : match.playerAId;
        await prisma.user.update({
          where: { id: loserId },
          data: { losses: { increment: 1 } },
        });

        // ✅ Fetch updated leaderboard
        const leaderboard = await prisma.user.findMany({
          orderBy: { points: "desc" },
          select: {
            id: true,
            fullName: true,
            points: true,
            wins: true,
            losses: true,
          },
        });

        // ✅ Broadcast updated leaderboard to all users
        io.emit("leaderboard-updated", { leaderboard });

        // ✅ Notify match viewers that the match has ended
        io.to(matchId).emit("match-ended", { matchId, winnerId });
      } catch (error) {
        console.error("Error ending match:", error);
        socket.emit("error", { message: "Failed to end match." });
      }
    });

    // ✅ Secure Score Updates (Only Referees Can Update Scores)
    socket.on("update-score", async (data) => {
      const { matchId, playerAScore, playerBScore } = data;

      if (
        !matchId ||
        playerAScore === undefined ||
        playerBScore === undefined
      ) {
        return socket.emit("error", { message: "Invalid score update data." });
      }

      try {
        const match = await prisma.match.findUnique({ where: { id: matchId } });

        if (!match) {
          return socket.emit("error", { message: "Match not found." });
        }

        if (socket.user.role !== "REFEREE") {
          return socket.emit("error", {
            message: "Unauthorized: Only referees can update scores.",
          });
        }

        if (match.refereeId !== socket.user.id) {
          return socket.emit("error", {
            message:
              "Unauthorized: You are not the assigned referee for this match.",
          });
        }

        await prisma.match.update({
          where: { id: matchId },
          data: { scoreA: playerAScore, scoreB: playerBScore },
        });

        console.log(
          `✅ Score Updated by Referee ${socket.user.email}: Match ${matchId} → A: ${playerAScore}, B: ${playerBScore}`
        );

        io.to(matchId).emit("score-updated", {
          matchId,
          playerAScore,
          playerBScore,
        });
        io.emit("static-score-updated", {
          matchId,
          playerAScore,
          playerBScore,
        });
      } catch (error) {
        console.error("Error updating score:", error);
        socket.emit("error", {
          message: "Failed to update score. Please try again.",
        });
      }
    });

    // ✅ Handle WebSocket disconnections
    socket.on("disconnect", () => {
      console.log(
        `⚠️ WebSocket Disconnected: ${socket.id}, User: ${socket.user?.email}`
      );
    });
  });
}
