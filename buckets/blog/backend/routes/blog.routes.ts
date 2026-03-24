import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/posts
router.get("/", async (_req: Request, res: Response) => {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } });
  res.json(posts);
});
// GET /api/posts/:id
router.get("/:id", async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id }, include: { author: { select: { id: true, name: true } } } });
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});
// POST /api/posts
router.post("/", async (req: Request, res: Response) => {
  const { title, content, excerpt, published, authorId, category } = req.body;
  const post = await prisma.post.create({ data: { title, content, excerpt: excerpt ?? "", published: published ?? false, authorId: authorId ?? "preview-user", category: category ?? "General" } });
  res.status(201).json(post);
});
// PUT /api/posts/:id
router.put("/:id", async (req: Request, res: Response) => {
  const { title, content, excerpt, published, category } = req.body;
  const post = await prisma.post.update({ where: { id: req.params.id }, data: { title, content, excerpt, published, category } });
  res.json(post);
});
// DELETE /api/posts/:id
router.delete("/:id", async (req: Request, res: Response) => {
  await prisma.post.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
