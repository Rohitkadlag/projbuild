"use client";

import { useState } from "react";

interface Product {
  id: string;
  title: string;
  price?: number;
}

interface AddToCartButtonProps {
  product: Product;
  cartId: string;
  onAdded?: () => void;
}

export default function AddToCartButton({ product, cartId, onAdded }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId,
          productId: product.id,
          name: product.title,
          price: product.price ?? 0,
          quantity: 1,
        }),
      });

      if (res.ok) {
        setAdded(true);
        onAdded?.();
        setTimeout(() => setAdded(false), 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className={`
        w-full py-2.5 rounded-xl text-sm font-semibold transition-all
        ${added
          ? "bg-green-600 text-white"
          : "bg-black text-white hover:bg-neutral-800"
        }
        disabled:opacity-50
      `}
    >
      {loading ? "Adding..." : added ? "✓ Added to cart" : "Add to cart"}
    </button>
  );
}
