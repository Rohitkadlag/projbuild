import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/members", async (_req: Request, res: Response) => {
  const members = await prisma.teamMember.findMany({ include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { joinedAt: "asc" } });
  res.json(members);
});
router.post("/invite", async (req: Request, res: Response) => {
  const { email, role } = req.body;
  const invite = await prisma.teamMember.create({ data: { email, role: role ?? "member", joinedAt: new Date() } });
  res.status(201).json(invite);
});
router.put("/members/:id/role", async (req: Request, res: Response) => {
  const member = await prisma.teamMember.update({ where: { id: req.params.id }, data: { role: req.body.role } });
  res.json(member);
});
router.delete("/members/:id", async (req: Request, res: Response) => {
  await prisma.teamMember.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
