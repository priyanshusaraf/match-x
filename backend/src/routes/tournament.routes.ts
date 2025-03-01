const prisma = require("../config/database");
const { authenticateJWT } = require("../middleware/authMiddleware");
const router = express.Router();

/**
 * 🔹 Fetch live match scores (for static display)
 */
router.get("/live-scores", authenticateJWT, async (req, res) => {
  try {
    const liveMatches = await prisma.match.findMany({
      where: { status: "IN_PROGRESS" }, // ✅ Fetch only ongoing matches
      select: {
        id: true,
        playerA: { select: { fullName: true } },
        playerB: { select: { fullName: true } },
        scoreA: true,
        scoreB: true,
        tournament: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" }, // ✅ Latest matches first
    });

    res.json({ success: true, matches: liveMatches });
  } catch (error) {
    console.error("Error fetching live scores:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve live scores." });
  }
});

module.exports = router;
