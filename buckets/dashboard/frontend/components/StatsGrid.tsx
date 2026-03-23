"use client";

import { useEffect, useState } from "react";

type Stats = {
  users: number;
  entities: number;
  timestamp: string;
};

export default function StatsGrid() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const cards = [
    { label: "Total Users", value: stats?.users ?? "—" },
    { label: "Total Records", value: stats?.entities ?? "—" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border bg-white p-6">
          <p className="text-sm text-neutral-500">{card.label}</p>
          <p className="mt-2 text-3xl font-semibold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
