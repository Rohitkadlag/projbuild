"use client";

import type { BucketConfigField } from "@app-builder/bucket-sdk";
import { ConfigFieldRenderer } from "./ConfigFieldRenderer";

type ArrayField = Extract<BucketConfigField, { type: "array" }>;

function getDefaultItem(field: ArrayField): unknown {
  if (field.itemType === "string") return "";
  if (field.itemType === "number") return 0;
  if (field.itemType === "object") {
    const schema = field.itemSchema ?? {};
    return Object.fromEntries(
      Object.entries(schema).map(([key, f]) => {
        switch (f.type) {
          case "boolean": return [key, f.default];
          case "string": return [key, f.default ?? ""];
          case "number": return [key, f.default ?? 0];
          case "select": return [key, f.default ?? f.options[0] ?? ""];
          case "array": return [key, f.default ?? []];
          default: return [key, null];
        }
      })
    );
  }
  return "";
}

interface Props {
  field: ArrayField;
  value: unknown[];
  onChange: (value: unknown[]) => void;
}

export function ArrayFieldRenderer({ field, value, onChange }: Props) {
  function addItem() {
    onChange([...value, getDefaultItem(field)]);
  }

  function updateItem(index: number, newValue: unknown) {
    const next = [...value];
    next[index] = newValue;
    onChange(next);
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  if (field.itemType === "string") {
    return (
      <div className="space-y-1.5">
        {value.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={typeof item === "string" ? item : ""}
              onChange={(e) => updateItem(index, e.target.value)}
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-3 hover:bg-danger/20 hover:text-danger text-text-muted transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border hover:border-accent hover:text-accent text-text-muted text-xs transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add item
        </button>
      </div>
    );
  }

  if (field.itemType === "object") {
    const schema = field.itemSchema ?? {};

    return (
      <div className="space-y-2">
        {value.map((item, index) => {
          const obj =
            item && typeof item === "object" && !Array.isArray(item)
              ? (item as Record<string, unknown>)
              : {};

          return (
            <div key={index} className="rounded-xl border border-border bg-surface-2 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-surface-3 border-b border-border">
                <span className="text-[10px] font-mono text-text-muted">
                  item {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-danger/20 hover:text-danger text-text-muted transition-colors"
                >
                  <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="px-3 py-3 space-y-2">
                {Object.entries(schema).map(([nestedKey, nestedField]) => (
                  <ConfigFieldRenderer
                    key={nestedKey}
                    fieldKey={nestedKey}
                    field={nestedField}
                    value={obj[nestedKey]}
                    onChange={(v) =>
                      updateItem(index, { ...obj, [nestedKey]: v })
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addItem}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border hover:border-accent hover:text-accent text-text-muted text-xs transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add field
        </button>
      </div>
    );
  }

  // number array
  return (
    <div className="space-y-1.5">
      {value.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="number"
            value={typeof item === "number" ? item : 0}
            onChange={(e) => updateItem(index, Number(e.target.value))}
            className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-3 hover:bg-danger/20 hover:text-danger text-text-muted transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border hover:border-accent hover:text-accent text-text-muted text-xs transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Add number
      </button>
    </div>
  );
}
