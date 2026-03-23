import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// Get or create cart
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId as string | undefined;
    const sessionId = req.headers["x-session-id"] as string | undefined;

    const where = userId ? { userId } : sessionId ? { sessionId } : null;
    if (!where) return res.status(400).json({ error: "No cart identifier" });

    let cart = await prisma.cart.findFirst({
      where,
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { ...where },
        include: { items: true },
      });
    }

    return res.json(cart);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Add item to cart
router.post("/items", async (req, res) => {
  try {
    const { cartId, productId, quantity, price, name } = req.body as {
      cartId: string;
      productId: string;
      quantity?: number;
      price: number;
      name: string;
    };

    if (!cartId || !productId || !price || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if item exists
    const existing = await prisma.cartItem.findFirst({
      where: { cartId, productId },
    });

    let item;
    if (existing) {
      item = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (quantity ?? 1) },
      });
    } else {
      item = await prisma.cartItem.create({
        data: { cartId, productId, quantity: quantity ?? 1, price, name },
      });
    }

    return res.status(201).json(item);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update item quantity
router.put("/items/:itemId", async (req, res) => {
  try {
    const { quantity } = req.body as { quantity: number };
    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: req.params.itemId } });
      return res.json({ deleted: true });
    }
    const item = await prisma.cartItem.update({
      where: { id: req.params.itemId },
      data: { quantity },
    });
    return res.json(item);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Remove item
router.delete("/items/:itemId", async (req, res) => {
  try {
    await prisma.cartItem.delete({ where: { id: req.params.itemId } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Clear cart
router.delete("/:cartId", async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { cartId: req.params.cartId } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
