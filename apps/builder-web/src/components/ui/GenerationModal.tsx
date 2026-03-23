"use client";

import { useEffect, useRef } from "react";
import { useBuilderStore } from "@/store/builderStore";

const STATUS_LABELS: Record<string, string> = {
  idle: "",
  resolving: "Resolving dependencies...",
  composing: "Composing app definition...",
  generating: "Generating full-stack codebase...",
  zipping: "Packaging into ZIP...",
  done: "Generation complete!",
  error: "Generation failed",
};

const STEPS = [
  { key: "resolving", label: "Resolve dependencies" },
  { key: "composing", label: "Compose app" },
  { key: "generating", label: "Generate code" },
  { key: "zipping", label: "Package ZIP" },
];

const STEP_ORDER = ["resolving", "composing", "generating", "zipping", "done"];

function getStepStatus(stepKey: string, currentStatus: string) {
  const stepIdx = STEP_ORDER.indexOf(stepKey);
  const currentIdx = STEP_ORDER.indexOf(currentStatus);

  if (currentStatus === "error") return "error";
  if (currentIdx > stepIdx) return "done";
  if (currentIdx === stepIdx) return "active";
  return "pending";
}

export function GenerationModal() {
  const { generationStatus, generationLog, downloadUrl, setGenerationStatus, appName } =
    useBuilderStore();
  const logRef = useRef<HTMLDivElement>(null);

  const isOpen = generationStatus !== "idle";

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [generationLog]);

  if (!isOpen) return null;

  function handleClose() {
    setGenerationStatus("idle");
  }

  function handleDownload() {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${appName}.zip`;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={generationStatus === "done" || generationStatus === "error" ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface-1 border border-border rounded-2xl shadow-layer-3 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {generationStatus === "done"
                ? `${appName} is ready`
                : generationStatus === "error"
                ? "Generation failed"
                : "Generating your app..."}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {STATUS_LABELS[generationStatus]}
            </p>
          </div>

          {(generationStatus === "done" || generationStatus === "error") && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Steps */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {STEPS.map((step, i) => {
              const status = getStepStatus(step.key, generationStatus);
              return (
                <div key={step.key} className="flex items-center gap-2 flex-1">
                  <div
                    className={`
                      w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold
                      ${status === "done" ? "bg-success text-white" : ""}
                      ${status === "active" ? "bg-accent text-white animate-pulse" : ""}
                      ${status === "pending" ? "bg-surface-3 text-text-muted border border-border" : ""}
                      ${status === "error" ? "bg-danger text-white" : ""}
                    `}
                  >
                    {status === "done" ? (
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : status === "active" ? (
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-[11px] truncate ${
                      status === "active"
                        ? "text-accent font-medium"
                        : status === "done"
                        ? "text-success"
                        : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-px flex-1 ${
                        status === "done" ? "bg-success/40" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Log */}
        <div
          ref={logRef}
          className="generation-log h-40 overflow-y-auto px-6 py-4 space-y-1 bg-surface-0"
        >
          {generationLog.map((line, i) => (
            <div
              key={i}
              className={`text-[11px] leading-relaxed ${
                line.startsWith("[error]")
                  ? "text-danger"
                  : line.startsWith("✓")
                  ? "text-success"
                  : "text-text-secondary"
              }`}
            >
              {line}
            </div>
          ))}
          {generationStatus !== "done" && generationStatus !== "error" && (
            <div className="text-[11px] text-text-muted flex items-center gap-1.5">
              <span className="inline-block w-1 h-3 bg-accent animate-pulse rounded-sm" />
            </div>
          )}
        </div>

        {/* Actions */}
        {generationStatus === "done" && (
          <div className="px-6 py-4 border-t border-border flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent hover:bg-accent-dim text-white text-sm font-semibold transition-all shadow-glow-sm hover:shadow-glow-accent active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V11M4 8L8 12L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 14H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Download {appName}.zip
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 text-text-secondary text-sm transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {generationStatus === "error" && (
          <div className="px-6 py-4 border-t border-border">
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-surface-3 hover:bg-surface-4 text-text-secondary text-sm transition-colors"
            >
              Close and try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
