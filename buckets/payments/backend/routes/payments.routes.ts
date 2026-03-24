import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (_req: Request, res: Response) => {
  const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true, email: true } } } });
  res.json(invoices);
});
router.post("/", async (req: Request, res: Response) => {
  const { amount, description, userId, dueDate } = req.body;
  const invoice = await prisma.invoice.create({ data: { amount: Number(amount), description: description ?? "", status: "pending", userId: userId ?? "preview-user", dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000) } });
  res.status(201).json(invoice);
});
router.put("/:id/pay", async (req: Request, res: Response) => {
  const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: { status: "paid", paidAt: new Date() } });
  res.json(invoice);
});
router.delete("/:id", async (req: Request, res: Response) => {
  await prisma.invoice.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
