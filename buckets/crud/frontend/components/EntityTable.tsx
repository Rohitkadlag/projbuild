"use client";

import { useEffect, useState } from "react";

type Entity = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  createdAt: string;
};

export default function EntityTable() {
  const [items, setItems] = useState<Entity[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadItems() {
    const res = await fetch("/api/entities");
    const data = await res.json();
    setItems(data);
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (res.ok) {
      setTitle("");
      setDescription("");
      await loadItems();
    }
    setLoading(false);
  }

  async function deleteItem(id: string) {
    await fetch(`/api/entities/${id}`, { method: "DELETE" });
    await loadItems();
  }

  useEffect(() => { void loadItems(); }, []);

  return (
    <div className="space-y-6">
      <form onSubmit={createItem} className="flex gap-3">
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black text-white px-4 py-2 text-sm"
        >
          Add
        </button>
      </form>
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium">{item.title}</td>
                <td className="px-4 py-3 text-neutral-500">{item.description}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400 text-sm">
                  No records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
