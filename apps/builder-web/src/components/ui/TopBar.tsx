"use client";

import { useState } from "react";
import { useBuilderStore } from "@/store/builderStore";

export function TopBar() {
  const {
    appName, setAppName, buckets,
    setGenerationStatus, appendLog, clearLog, setDownloadUrl,
    setShowPreviewPanel, aiThinking,
  } = useBuilderStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(appName);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (buckets.length === 0) return;
    setGenerating(true);
    clearLog();
    setGenerationStatus("resolving");
    setDownloadUrl(null);

    try {
      appendLog("[1/4] Resolving bucket dependencies...");
      setGenerationStatus("composing");
      appendLog("[2/4] Composing app definition...");
      setGenerationStatus("generating");
      appendLog("[3/4] Generating full-stack codebase...");

      const res = await fetch("/api/generate", {
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

      if (!res.ok || !data.success) {
        appendLog(`[error] ${data.error ?? "Generation failed"}`);
        setGenerationStatus("error");
        return;
      }

      for (const log of data.logs ?? []) {
        appendLog(log);
      }

      setGenerationStatus("zipping");
      appendLog("[4/4] Packaging ZIP...");

      const binary = atob(data.zipBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/zip" });
      setDownloadUrl(URL.createObjectURL(blob));
      setGenerationStatus("done");
      appendLog(`✓ "${appName}" generated successfully!`);
      appendLog(`✓ ZIP ready for download.`);
    } catch (err) {
      appendLog(`[error] ${String(err)}`);
      setGenerationStatus("error");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <header className="flex items-center justify-between px-5 h-14 border-b border-border bg-surface-1 shrink-0 z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white text-xs font-bold shadow-glow-sm">
          AB
        </div>
        <span className="font-display text-sm font-bold text-text-primary tracking-tight hidden sm:block">
          App Bucket Builder
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted hidden sm:block">Project:</span>
        {editingName ? (
          <input
            className="bg-surface-3 border border-border rounded-md px-3 py-1 text-sm text-text-primary font-mono focus:outline-none focus:border-accent w-40"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={() => {
              const s = nameInput.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "") || "my-app";
              setAppName(s);
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setNameInput(appName); setEditingName(false); }
            }}
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setNameInput(appName); setEditingName(true); }}
            className="flex items-center gap-1.5 bg-surface-3 border border-border rounded-md px-3 py-1 text-sm font-mono text-text-primary hover:border-border-bright transition-colors"
          >
            {appName}
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-text-muted">
              <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {aiThinking && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/50 border border-indigo-800/40">
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{animationDelay:`${i*0.1}s`}}/>
              ))}
            </div>
            <span className="text-xs text-accent">AI thinking</span>
          </div>
        )}

        <div className="text-xs text-text-muted hidden sm:block">
          {buckets.length === 0 ? "No buckets" : `${buckets.length} bucket${buckets.length !== 1 ? "s" : ""}`}
        </div>

        {/* Preview button */}
        <button
          onClick={() => setShowPreviewPanel(true)}
          disabled={buckets.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border border-border bg-surface-2 hover:bg-surface-3 hover:border-border-bright text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M6 5.5L11 8L6 10.5V5.5Z" fill="currentColor"/>
          </svg>
          Preview
        </button>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={buckets.length === 0 || generating}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
            ${buckets.length === 0 || generating
              ? "bg-surface-3 text-text-muted cursor-not-allowed border border-border"
              : "bg-accent hover:bg-accent-dim text-white shadow-glow-sm hover:shadow-glow-accent active:scale-95"
            }
          `}
        >
          {generating ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 8L2 14V2Z" fill="currentColor"/>
              </svg>
              Generate App
            </>
          )}
        </button>
      </div>
    </header>
  );
}
