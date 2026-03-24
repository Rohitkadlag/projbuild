import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (_req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } });
  res.json(reviews);
});
router.get("/:entityId", async (req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({ where: { entityId: req.params.entityId }, orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } } } });
  res.json(reviews);
});
router.post("/", async (req: Request, res: Response) => {
  const { entityId, rating, comment, authorId } = req.body;
  const review = await prisma.review.create({ data: { entityId, rating: Number(rating), comment: comment ?? "", authorId: authorId ?? "preview-user" } });
  res.status(201).json(review);
});
router.delete("/:id", async (req: Request, res: Response) => {
  await prisma.review.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
