"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { useBuilderStore } from "@/store/builderStore";
import { getBucketManifest, BUCKET_REGISTRY } from "@/lib/bucketRegistry";
import { createDefaultConfig } from "@/lib/defaultConfig";

export function AIPromptBar() {
  const [prompt, setPrompt] = useState("");
  const { addBucket, clearBuckets, setAiThinking, setAiExplanation, aiThinking, aiExplanation, setAppName } =
    useBuilderStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || aiThinking) return;

    setAiThinking(true);
    setAiExplanation(null);

    try {
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAiExplanation(`Error: ${err.error}`);
        return;
      }

      const data = await res.json() as {
        buckets: Array<{ name: string; config: Record<string, unknown> }>;
        explanation: string;
        appName: string;
      };

      // Clear existing buckets and add suggested ones
      clearBuckets();

      if (data.appName) {
        setAppName(data.appName);
      }

      let xOffset = 80;
      for (const suggestion of data.buckets) {
        const manifest = getBucketManifest(suggestion.name);
        if (!manifest) continue;

        const defaultConfig = createDefaultConfig(manifest);
        const mergedConfig = { ...defaultConfig, ...suggestion.config };

        addBucket({
          id: nanoid(),
          bucketName: manifest.name,
          displayName: manifest.displayName,
          icon: manifest.icon ?? "📦",
          category: manifest.category,
          position: { x: xOffset, y: 80 },
          config: mergedConfig,
        });

        xOffset += 240;
      }

      setAiExplanation(data.explanation);
      setPrompt("");
    } catch (err) {
      setAiExplanation(`Error: ${String(err)}`);
    } finally {
      setAiThinking(false);
    }
  }

  const examples = [
    "ecommerce app with login and shopping cart",
    "bakery ordering app with products",
    "SaaS dashboard with user management",
    "file sharing platform with auth",
  ];

  return (
    <div className="border-b border-border bg-surface-1 px-5 py-3 shrink-0">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* AI icon */}
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
          </svg>
        </div>

        <div className="flex-1 relative">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Describe your app — e.g. "ecommerce app with auth, products and cart"'
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors pr-24"
            disabled={aiThinking}
          />
          {aiThinking && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-accent">Thinking</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!prompt.trim() || aiThinking}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-glow-sm shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
          </svg>
          AI Build
        </button>
      </form>

      {/* Explanation or examples */}
      {aiExplanation && !aiThinking && (
        <div className="mt-2.5 flex items-start gap-2 animate-fade-in">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-accent mt-0.5 shrink-0">
            <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-xs text-text-secondary leading-relaxed">{aiExplanation}</p>
        </div>
      )}

      {!aiExplanation && !aiThinking && (
        <div className="mt-2 flex items-center gap-2 overflow-hidden">
          <span className="text-[11px] text-text-muted shrink-0">Try:</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="text-[11px] text-text-muted hover:text-accent whitespace-nowrap transition-colors"
              >
                "{ex}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
