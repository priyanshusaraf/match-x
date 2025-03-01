const session = require("express-session");
const passport = require("./config/passport");
const authRoutes = require("./routes/auth.routes");
const tournamentRoutes = require("./routes/tournament.routes");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const configureWebSockets = require("./websocket"); // ✅ Import WebSocket module

dotenv.config();
const app = express();
const server = http.createServer(app);

// ✅ Initialize WebSocket server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

// ✅ Move WebSocket Logic to Separate Module
configureWebSockets(io);

// ✅ Middleware for parsing cookies
app.use(cookieParser());

// ✅ Enable CORS to allow frontend requests
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ✅ Enable JSON body parsing for API requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Express Session (Needed for Passport)
app.use(
  session({
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// ✅ Initialize Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

// ✅ Register authentication routes
app.use("/auth", authRoutes);

// ✅ Register tournament-related API routes (protected with JWT)
app.use("/tournaments", tournamentRoutes);

// ✅ Handle 404 errors for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ✅ Gracefully handle server errors
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// ✅ Ensure WebSocket connections close when the server shuts down
process.on("SIGTERM", () => {
  console.log("👋 Server shutting down...");
  io.close(() => {
    console.log("🛑 WebSocket server closed.");
    server.close(() => {
      console.log("✅ HTTP server closed.");
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
