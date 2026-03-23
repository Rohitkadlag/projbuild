"use client";

import { create } from "zustand";

export interface PlacedBucket {
  id: string;
  bucketName: string;
  displayName: string;
  icon: string;
  category: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export type GenerationStatus =
  | "idle"
  | "resolving"
  | "composing"
  | "generating"
  | "zipping"
  | "done"
  | "error";

interface BuilderState {
  appName: string;
  buckets: PlacedBucket[];
  selectedBucketId: string | null;
  generationStatus: GenerationStatus;
  generationLog: string[];
  downloadUrl: string | null;

  setAppName: (name: string) => void;
  addBucket: (bucket: PlacedBucket) => void;
  updateBucketConfig: (id: string, key: string, value: unknown) => void;
  updateBucketPosition: (id: string, pos: { x: number; y: number }) => void;
  removeBucket: (id: string) => void;
  selectBucket: (id: string | null) => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  appendLog: (msg: string) => void;
  clearLog: () => void;
  setDownloadUrl: (url: string | null) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  appName: "my-app",
  buckets: [],
  selectedBucketId: null,
  generationStatus: "idle",
  generationLog: [],
  downloadUrl: null,

  setAppName: (name) => set({ appName: name }),

  addBucket: (bucket) =>
    set((state) => ({
      buckets: state.buckets.find((b) => b.bucketName === bucket.bucketName)
        ? state.buckets
        : [...state.buckets, bucket],
      selectedBucketId: state.buckets.find(
        (b) => b.bucketName === bucket.bucketName
      )
        ? state.selectedBucketId
        : bucket.id,
    })),

  updateBucketConfig: (id, key, value) =>
    set((state) => ({
      buckets: state.buckets.map((b) =>
        b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b
      ),
    })),

  updateBucketPosition: (id, pos) =>
    set((state) => ({
      buckets: state.buckets.map((b) =>
        b.id === id ? { ...b, position: pos } : b
      ),
    })),

  removeBucket: (id) =>
    set((state) => ({
      buckets: state.buckets.filter((b) => b.id !== id),
      selectedBucketId:
        state.selectedBucketId === id ? null : state.selectedBucketId,
    })),

  selectBucket: (id) => set({ selectedBucketId: id }),

  setGenerationStatus: (status) => set({ generationStatus: status }),

  appendLog: (msg) =>
    set((state) => ({ generationLog: [...state.generationLog, msg] })),

  clearLog: () => set({ generationLog: [] }),

  setDownloadUrl: (url) => set({ downloadUrl: url }),
}));
