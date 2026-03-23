"use client";

import type { BucketConfigField } from "@app-builder/bucket-sdk";
import { ArrayFieldRenderer } from "./ArrayFieldRenderer";

interface Props {
  fieldKey: string;
  field: BucketConfigField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function ConfigFieldRenderer({ fieldKey, field, value, onChange }: Props) {
  const label = field.label ?? fieldKey;

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        {field.type !== "boolean" && (
          <span className="text-[10px] font-mono text-text-muted">{field.type}</span>
        )}
      </div>
      {field.description && (
        <p className="text-[11px] text-text-muted leading-relaxed">{field.description}</p>
      )}

      {field.type === "boolean" && (
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => onChange(!Boolean(value))}
            className={`
              relative w-9 h-5 rounded-full transition-colors cursor-pointer
              ${Boolean(value) ? "bg-accent" : "bg-surface-4"}
            `}
          >
            <div
              className={`
                absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                ${Boolean(value) ? "translate-x-4" : "translate-x-0.5"}
              `}
            />
          </div>
          <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
            {Boolean(value) ? "Enabled" : "Disabled"}
          </span>
        </label>
      )}

      {field.type === "string" && (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"placeholder" in field ? field.placeholder : ""}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors font-mono"
        />
      )}

      {field.type === "number" && (
        <input
          type="number"
          value={typeof value === "number" ? value : 0}
          min={"min" in field ? field.min : undefined}
          max={"max" in field ? field.max : undefined}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors font-mono"
        />
      )}

      {field.type === "select" && (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt} className="bg-surface-2">
              {opt}
            </option>
          ))}
        </select>
      )}

      {field.type === "array" && (
        <ArrayFieldRenderer
          field={field}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      )}
    </div>
  );
}
