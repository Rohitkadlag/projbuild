"use client";

import { useState } from "react";
import { useBuilderStore } from "@/store/builderStore";

const BUILD_STEPS = [
  "Copying base template",
  "Injecting feature buckets",
  "Merging Prisma schema & converting to SQLite",
  "Installing backend dependencies",
  "Running prisma db push",
  "Seeding demo data",
  "Starting Express API server",
  "Generating frontend pages",
  "Installing frontend dependencies",
  "Starting Next.js frontend",
];

function stepFromLog(logs: string[]): number {
  const last = logs.filter(l => l.startsWith("[preview]")).pop() ?? "";
  if (last.includes("Frontend ready") || last.includes("frontend on port")) return 10;
  if (last.includes("Installing web") || last.includes("web depend")) return 9;
  if (last.includes("frontend") || last.includes("Generating web") || last.includes("generateWebApp")) return 8;
  if (last.includes("API ready") || last.includes("Starting API")) return 7;
  if (last.includes("Seeding")) return 6;
  if (last.includes("Pushing schema")) return 5;
  if (last.includes("Installing API") || last.includes("Installing depend")) return 4;
  if (last.includes("Converting") || last.includes("Merging")) return 3;
  if (last.includes("Injecting")) return 2;
  if (last.includes("Copying")) return 1;
  return 0;
}

type TabId = "app" | "api" | "info";

export function PreviewPanel() {
  const {
    showPreviewPanel, setShowPreviewPanel,
    previewStatus, setPreviewStatus,
    previewLogs, appendPreviewLog, clearPreviewLogs,
    previewApiUrl, setPreviewApiUrl,
    previewWebUrl, setPreviewWebUrl,
    previewBuildId, setPreviewBuildId,
    previewDemoCredentials, setPreviewDemoCredentials,
    previewEndpoints, setPreviewEndpoints,
    buckets, appName,
  } = useBuilderStore();

  const [tab, setTab] = useState<TabId>("app");
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  async function launchPreview() {
    clearPreviewLogs();
    setPreviewStatus("building");
    appendPreviewLog("[preview] Starting preview build...");
    setTab("app");

    try {
      const res = await fetch("/api/preview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          buckets: buckets.map(b => ({ bucketName: b.bucketName, config: b.config })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        appendPreviewLog(`[error] ${data.error ?? "Preview failed"}`);
        setPreviewStatus("error");
        return;
      }

      for (const log of data.logs ?? []) appendPreviewLog(log);

      setPreviewBuildId(data.buildId);
      setPreviewApiUrl(data.apiUrl);
      setPreviewWebUrl(data.webUrl);
      setPreviewDemoCredentials(data.demoCredentials ?? null);
      setPreviewEndpoints(data.endpoints ?? []);
      setPreviewStatus("live");
      appendPreviewLog(`✓ Preview live at ${data.webUrl}`);
    } catch (err) {
      appendPreviewLog(`[error] ${String(err)}`);
      setPreviewStatus("error");
    }
  }

  async function stopPreview() {
    if (previewBuildId) {
      await fetch(`/api/preview/stop/${previewBuildId}`, { method: "DELETE" }).catch(() => {});
    }
    setPreviewStatus("idle");
    setPreviewBuildId(null);
    setPreviewApiUrl(null);
    setPreviewWebUrl(null);
    setPreviewDemoCredentials(null);
    setPreviewEndpoints([]);
    clearPreviewLogs();
  }

  async function testEndpoint(ep: { method: string; path: string; url: string }) {
    try {
      const r = await fetch(ep.url, { method: ep.method });
      const txt = await r.text();
      let pretty = txt;
      try { pretty = JSON.stringify(JSON.parse(txt), null, 2); } catch {}
      setTestResults(prev => ({ ...prev, [ep.path]: `${r.status} ${r.statusText}\n\n${pretty.slice(0, 600)}` }));
    } catch (e) {
      setTestResults(prev => ({ ...prev, [ep.path]: `Error: ${String(e)}` }));
    }
  }

  if (!showPreviewPanel) return null;

  const currentStep = stepFromLog(previewLogs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (previewStatus !== "building") setShowPreviewPanel(false); }}
      />
      <div className={`relative flex flex-col bg-surface-1 border border-border rounded-2xl shadow-layer-3 overflow-hidden animate-scale-in ${
        previewStatus === "live" ? "w-full max-w-5xl h-[90vh]" : "w-full max-w-2xl"
      }`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              previewStatus === "live" ? "bg-green-950 border border-green-800" :
              previewStatus === "building" ? "bg-indigo-950 border border-indigo-800" :
              previewStatus === "error" ? "bg-red-950 border border-red-800" :
              "bg-surface-3 border border-border"
            }`}>
              {previewStatus === "live" && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
              {previewStatus === "building" && (
                <svg className="animate-spin w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {(previewStatus === "idle" || previewStatus === "error") && (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-text-muted">
                  <path d="M3 8L13 8M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="text-sm font-semibold text-text-primary">
              {previewStatus === "live" ? appName :
               previewStatus === "building" ? "Building preview..." :
               previewStatus === "error" ? "Build failed" : "Preview App"}
            </span>
            {previewStatus === "live" && previewWebUrl && (
              <a href={previewWebUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-accent hover:underline">{previewWebUrl}</a>
            )}
          </div>
          <div className="flex items-center gap-2">
            {previewStatus === "live" && (
              <>
                {/* Tab switcher */}
                <div className="flex items-center bg-surface-3 rounded-lg p-0.5 gap-0.5">
                  {([["app", "Live App"], ["api", "API"], ["info", "Info"]] as [TabId, string][]).map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)}
                      className={`text-xs px-3 py-1 rounded-md transition-colors ${
                        tab === id ? "bg-surface-1 text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={stopPreview}
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-red-950/40 text-text-muted hover:text-red-400 border border-border hover:border-red-800/40 transition-all">
                  Stop
                </button>
              </>
            )}
            {previewStatus !== "building" && (
              <button onClick={() => setShowPreviewPanel(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-3 text-text-muted ml-1">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-hidden ${previewStatus === "live" && tab === "app" ? "flex flex-col" : "overflow-y-auto px-6 py-5"}`}>

          {/* IDLE */}
          {previewStatus === "idle" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: "🖥️", title: "Real Frontend", sub: "Next.js pages, real UI" },
                  { icon: "⚡", title: "Live Backend", sub: "Express + SQLite" },
                  { icon: "🌱", title: "Seeded Data", sub: "Demo users & records" },
                ].map(f => (
                  <div key={f.title} className="px-3 py-4 bg-surface-2 rounded-xl border border-border">
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <p className="text-xs font-semibold text-text-primary">{f.title}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">{f.sub}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted text-center">Takes ~30 seconds to build. Same code ships in the ZIP.</p>
              <button onClick={launchPreview} disabled={buckets.length === 0}
                className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dim text-white text-sm font-semibold transition-all shadow-glow-sm hover:shadow-glow-accent active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                Launch Preview
              </button>
            </div>
          )}

          {/* BUILDING */}
          {previewStatus === "building" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                {BUILD_STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      active ? "bg-indigo-950/40 border border-indigo-800/30" : done ? "opacity-60" : "opacity-25"
                    }`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        done ? "bg-green-900 border border-green-700" :
                        active ? "bg-indigo-900 border border-indigo-600" : "bg-surface-3 border border-border"
                      }`}>
                        {done ? (
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        ) : active ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
                        ) : (
                          <div className="w-1 h-1 rounded-full bg-surface-1"/>
                        )}
                      </div>
                      <span className={`text-xs ${active ? "text-indigo-300 font-medium" : done ? "text-text-secondary" : "text-text-muted"}`}>
                        {step}
                      </span>
                      {active && (
                        <div className="ml-auto flex gap-0.5">
                          {[0,1,2].map(j => (
                            <div key={j} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay:`${j*0.12}s`}}/>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {previewLogs.length > 0 && (
                <div className="bg-surface-0 rounded-xl border border-border p-3 max-h-28 overflow-y-auto font-mono text-[10px] text-text-muted space-y-0.5">
                  {previewLogs.slice(-20).map((l, i) => (
                    <div key={i} className={l.startsWith("[error]") ? "text-red-400" : l.startsWith("✓") ? "text-green-400" : ""}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ERROR */}
          {previewStatus === "error" && (
            <div className="space-y-4">
              <div className="px-4 py-3 bg-red-950/30 border border-red-800/30 rounded-xl">
                <p className="text-xs font-semibold text-red-400 mb-1">Build failed</p>
                {previewLogs.filter(l => l.startsWith("[error]")).map((l, i) => (
                  <p key={i} className="text-[11px] text-red-400/70 font-mono">{l}</p>
                ))}
              </div>
              <div className="bg-surface-0 rounded-xl border border-border p-3 max-h-40 overflow-y-auto font-mono text-[10px] text-text-muted space-y-0.5">
                {previewLogs.map((l, i) => (
                  <div key={i} className={l.startsWith("[error]") ? "text-red-400" : ""}>{l}</div>
                ))}
              </div>
              <button onClick={() => { setPreviewStatus("idle"); clearPreviewLogs(); }}
                className="w-full py-2.5 rounded-xl bg-surface-3 hover:bg-surface-2 text-text-secondary text-sm font-medium border border-border transition-colors">
                Try again
              </button>
            </div>
          )}

          {/* LIVE - App tab: iframe */}
          {previewStatus === "live" && tab === "app" && (
            <>
              {previewWebUrl ? (
                <iframe
                  src={previewWebUrl}
                  className="flex-1 w-full border-0"
                  title="App Preview"
                  allow="*"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
                  No frontend URL available
                </div>
              )}
              {previewDemoCredentials && (
                <div className="shrink-0 px-4 py-2 bg-green-950/20 border-t border-green-800/20 flex items-center gap-4">
                  <span className="text-[11px] text-green-400 font-semibold uppercase tracking-widest">Demo</span>
                  <span className="text-xs font-mono text-text-secondary">{previewDemoCredentials.email}</span>
                  <span className="text-xs font-mono text-text-muted">{previewDemoCredentials.password}</span>
                </div>
              )}
            </>
          )}

          {/* LIVE - API tab */}
          {previewStatus === "live" && tab === "api" && (
            <div className="space-y-3">
              {previewEndpoints.length === 0 && (
                <p className="text-sm text-text-muted text-center py-8">No endpoints found</p>
              )}
              {previewEndpoints.map(ep => (
                <div key={ep.path} className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      ep.method === "GET" ? "bg-blue-900/60 text-blue-300" :
                      ep.method === "POST" ? "bg-green-900/60 text-green-300" :
                      ep.method === "PUT" ? "bg-yellow-900/60 text-yellow-300" :
                      "bg-red-900/60 text-red-300"
                    }`}>{ep.method}</span>
                    <code className="text-xs font-mono text-text-primary flex-1 truncate">{ep.path}</code>
                    <button onClick={() => testEndpoint(ep)}
                      className="text-[10px] bg-accent/20 text-accent px-2.5 py-1 rounded hover:bg-accent/30 transition-colors font-medium">
                      Test
                    </button>
                  </div>
                  {testResults[ep.path] && (
                    <pre className="px-3 py-2 bg-surface-0 text-[10px] font-mono text-text-secondary overflow-x-auto max-h-32 whitespace-pre-wrap">
                      {testResults[ep.path]}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* LIVE - Info tab */}
          {previewStatus === "live" && tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Frontend", value: previewWebUrl ?? "—" },
                  { label: "Backend API", value: previewApiUrl ?? "—" },
                  { label: "Buckets", value: buckets.map(b => b.bucketName).join(", ") },
                  { label: "DB", value: "SQLite (preview)" },
                ].map(item => (
                  <div key={item.label} className="bg-surface-2 rounded-xl p-3 border border-border">
                    <p className="text-[11px] text-text-muted mb-1">{item.label}</p>
                    <p className="text-xs text-text-primary font-mono truncate">{item.value}</p>
                  </div>
                ))}
              </div>
              {previewDemoCredentials && (
                <div className="px-4 py-3 bg-green-950/20 border border-green-800/20 rounded-xl">
                  <p className="text-[11px] font-semibold text-green-400 uppercase tracking-widest mb-2">Demo Credentials</p>
                  <p className="text-xs font-mono text-text-secondary">{previewDemoCredentials.email} / {previewDemoCredentials.password}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
