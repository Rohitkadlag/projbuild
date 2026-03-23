"use client";

import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type Cart = {
  id: string;
  items: CartItem[];
};

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);

  async function loadCart() {
    const res = await fetch("/api/cart");
    if (res.ok) setCart(await res.json());
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
    await loadCart();
  }

  useEffect(() => { void loadCart(); }, []);

  const total = cart?.items.reduce((sum, i) => sum + i.price * i.quantity, 0) ?? 0;
  const count = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-lg hover:bg-neutral-100"
      >
        🛒
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-80 h-full bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <h2 className="font-semibold">Cart ({count})</h2>
              <button onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {cart?.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-neutral-500">
                      ${item.price} × {item.quantity}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {!cart?.items.length && (
                <p className="text-sm text-neutral-400 text-center py-8">
                  Your cart is empty
                </p>
              )}
            </div>
            <div className="px-4 py-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Total</span>
                <span className="font-bold">${total.toFixed(2)}</span>
              </div>
              <button className="w-full py-2.5 bg-black text-white rounded-xl text-sm font-semibold">
                Checkout →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
