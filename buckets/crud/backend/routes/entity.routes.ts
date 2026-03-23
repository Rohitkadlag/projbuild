import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await prisma.entity.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json(items);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, status, data } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      data?: Record<string, unknown>;
    };

    if (!title) return res.status(400).json({ error: "Title is required" });

    const item = await prisma.entity.create({
      data: { title, description, status: status ?? "active", data },
    });
    return res.status(201).json(item);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await prisma.entity.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { title, description, status, data } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      data?: Record<string, unknown>;
    };

    const item = await prisma.entity.update({
      where: { id: req.params.id },
      data: { title, description, status, data },
    });
    return res.json(item);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.entity.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
