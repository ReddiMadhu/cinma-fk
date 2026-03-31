/**
 * useSessionStore.js — Zustand global state for the CAT pipeline wizard.
 */
import { create } from 'zustand';

export const useSessionStore = create((set) => ({
  // Current active session ID
  uploadId: null,
  setUploadId: (id) => set({ uploadId: id }),

  // Target format: 'AIR' or 'RMS'
  targetFormat: 'AIR',
  setTargetFormat: (fmt) => set({ targetFormat: fmt }),

  // Upload metadata from POST /upload
  uploadMeta: null,
  setUploadMeta: (meta) => set({ uploadMeta: meta }),

  // Column mapping: { sourceCol: canonicalField | null }
  columnMap: {},
  setColumnMap: (map) => set({ columnMap: map }),

  // Pipeline step results
  geocodeResult: null,
  setGeocodeResult: (r) => set({ geocodeResult: r }),

  mapCodesResult: null,
  setMapCodesResult: (r) => set({ mapCodesResult: r }),

  normalizeResult: null,
  setNormalizeResult: (r) => set({ normalizeResult: r }),

  // Review flags
  reviewData: null,
  setReviewData: (d) => set({ reviewData: d }),

  // Rules config (advanced settings)
  rulesConfig: {},
  setRulesConfig: (r) => set({ rulesConfig: r }),

  // Reset entire session state
  reset: () => set({
    uploadId: null,
    uploadMeta: null,
    columnMap: {},
    geocodeResult: null,
    mapCodesResult: null,
    normalizeResult: null,
    reviewData: null,
    rulesConfig: {},
  }),
}));
