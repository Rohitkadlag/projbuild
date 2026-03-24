import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (_req: Request, res: Response) => {
  const bookings = await prisma.booking.findMany({ orderBy: { scheduledAt: "asc" }, include: { user: { select: { id: true, name: true, email: true } } } });
  res.json(bookings);
});
router.post("/", async (req: Request, res: Response) => {
  const { title, notes, scheduledAt, durationMinutes, userId } = req.body;
  const booking = await prisma.booking.create({ data: { title, notes: notes ?? "", scheduledAt: new Date(scheduledAt), durationMinutes: Number(durationMinutes ?? 30), status: "pending", userId: userId ?? "preview-user" } });
  res.status(201).json(booking);
});
router.put("/:id/status", async (req: Request, res: Response) => {
  const booking = await prisma.booking.update({ where: { id: req.params.id }, data: { status: req.body.status } });
  res.json(booking);
});
router.delete("/:id", async (req: Request, res: Response) => {
  await prisma.booking.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
