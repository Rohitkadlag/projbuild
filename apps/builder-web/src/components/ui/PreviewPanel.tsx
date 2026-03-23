"use client";

import { useState } from "react";
import { useBuilderStore } from "@/store/builderStore";

export function PreviewPanel() {
  const {
    showPreviewPanel,
    setShowPreviewPanel,
    previewStatus,
    setPreviewStatus,
    previewComposed,
    setPreviewComposed,
    previewMissingEnv,
    setPreviewMissingEnv,
    buckets,
    appName,
  } = useBuilderStore();
  const [loading, setLoading] = useState(false);

  async function analyzePreview() {
    setLoading(true);
    setPreviewStatus("analyzing");
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          buckets: buckets.map((b) => ({
            bucketName: b.bucketName,
            config: b.config,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPreviewStatus("error");
        return;
      }

      setPreviewComposed(data.composed);
      setPreviewMissingEnv(data.missingEnv ?? []);
      setPreviewStatus(data.canPreviewNow ? "ready" : "needs-input");
    } finally {
      setLoading(false);
    }
  }

  if (!showPreviewPanel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowPreviewPanel(false)}
      />
      <div className="relative w-full max-w-2xl bg-surface-1 border border-border rounded-2xl shadow-layer-3 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-950 border border-green-800 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-green-400">
                <path d="M3 8L13 8M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Preview App</h2>
              <p className="text-xs text-text-muted">Analyze requirements before launching</p>
            </div>
          </div>
          <button
            onClick={() => setShowPreviewPanel(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-3 text-text-muted"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {previewStatus === "idle" && (
            <div className="text-center py-4">
              <p className="text-sm text-text-secondary mb-4">
                Analyze your <span className="text-text-primary font-medium">{appName}</span> app ({buckets.length} buckets) to see preview requirements.
              </p>
              <button
                onClick={analyzePreview}
                disabled={loading || buckets.length === 0}
                className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-dim transition-all disabled:opacity-50"
              >
                Analyze Requirements
              </button>
            </div>
          )}

          {(previewStatus === "analyzing" || loading) && (
            <div className="text-center py-6">
              <div className="flex justify-center mb-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-accent mx-1 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-sm text-text-muted">Analyzing your app configuration...</p>
            </div>
          )}

          {previewComposed && (previewStatus === "ready" || previewStatus === "needs-input") && (
            <div className="space-y-5">
              {/* Composed summary */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Buckets", value: previewComposed.buckets.join(", ") },
                  { label: "DB Models", value: previewComposed.dbModels.join(", ") || "none" },
                  { label: "API Routes", value: `${previewComposed.backendRoutes.length} routes` },
                  { label: "Pages", value: `${previewComposed.frontendRoutes.length} pages` },
                ].map((item) => (
                  <div key={item.label} className="bg-surface-2 rounded-xl p-3 border border-border">
                    <p className="text-[11px] text-text-muted mb-1">{item.label}</p>
                    <p className="text-xs text-text-primary font-mono">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Sandbox env */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">
                  Auto-configured for sandbox preview
                </h3>
                <div className="space-y-1.5">
                  {Object.entries(previewComposed.previewEnv).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-3 px-3 py-2 bg-surface-2 rounded-lg border border-border">
                      <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                      <span className="text-[11px] font-mono text-text-secondary flex-1">{key}</span>
                      <span className="text-[11px] font-mono text-text-muted truncate max-w-[140px]">
                        {val.includes("secret") ? "••••••••" : val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing env */}
              {previewMissingEnv.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">
                    Optional — fill for real integrations
                  </h3>
                  <div className="space-y-1.5">
                    {previewMissingEnv.map((key) => (
                      <div key={key} className="flex items-center gap-3 px-3 py-2 bg-surface-2 rounded-lg border border-border">
                        <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                        <span className="text-[11px] font-mono text-text-secondary flex-1">{key}</span>
                        <span className="text-[11px] text-text-muted">optional</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seed info */}
              {previewComposed.needsSeed && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-indigo-950/30 rounded-xl border border-indigo-800/30">
                  <span className="text-sm">🌱</span>
                  <p className="text-xs text-indigo-300 leading-relaxed">
                    Sample data will be automatically seeded — demo users, products, and records so your preview feels alive immediately.
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3 pt-1">
                <div className="flex-1 px-4 py-3 bg-green-950/30 border border-green-800/30 rounded-xl text-center">
                  <p className="text-xs text-green-300 font-medium mb-0.5">Sandbox Preview</p>
                  <p className="text-[11px] text-green-400/70">Runs immediately, no setup</p>
                </div>
                <button
                  onClick={() => setShowPreviewPanel(false)}
                  className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-dim text-white text-sm font-semibold transition-all"
                >
                  Got it — Generate App
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
