"use client";

import { useState } from "react";
import { MintEvm } from "./MintEvm";
import { MintSolana } from "./MintSolana";
import { MintSui } from "./MintSui";

type Tab = "evm" | "solana" | "sui";

const TABS: { id: Tab; label: string }[] = [
  { id: "evm", label: "EVM (ETH / BSC / Base)" },
  { id: "solana", label: "Solana" },
  { id: "sui", label: "Sui" },
];

export function EcosystemTabs() {
  const [tab, setTab] = useState<Tab>("evm");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        {tab === "evm" && <MintEvm />}
        {tab === "solana" && <MintSolana />}
        {tab === "sui" && <MintSui />}
      </div>
    </div>
  );
}
