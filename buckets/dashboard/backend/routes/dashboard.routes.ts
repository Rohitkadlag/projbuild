import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

router.get("/stats", async (_req, res) => {
  try {
    const [userCount, entityCount] = await Promise.all([
      prisma.user.count(),
      prisma.entity.count(),
    ]);

    return res.json({
      users: userCount,
      entities: entityCount,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
