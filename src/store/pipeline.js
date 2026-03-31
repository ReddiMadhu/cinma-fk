import { create } from "zustand";
import { persist } from "zustand/middleware";

export const usePipelineStore = create(
  persist(
    (set, get) => ({
      // Active session
      uploadId: null,
      targetFormat: "AIR",
      currentStep: 0, // 0=upload 1=map 2=run 3=review 4=done
      uploadResponse: null,
      columnMap: {},
      stagesComplete: {
        upload: false,
        columns: false,
        geocode: false,
        map_codes: false,
        normalize: false,
        review: false,
      },
      flagCount: 0,

      // Actions
      setUploadResponse: (res) =>
        set({
          uploadId: res.upload_id,
          uploadResponse: res,
          stagesComplete: { upload: true, columns: false, geocode: false, map_codes: false, normalize: false, review: false },
          currentStep: 1,
        }),

      setColumnMap: (map) => set({ columnMap: map }),

      markStageComplete: (stage) =>
        set((state) => ({
          stagesComplete: { ...state.stagesComplete, [stage]: true },
        })),

      advanceStep: () =>
        set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),

      setFlagCount: (count) => set({ flagCount: count }),

      resetSession: () =>
        set({
          uploadId: null,
          targetFormat: "AIR",
          currentStep: 0,
          uploadResponse: null,
          columnMap: {},
          stagesComplete: { upload: false, columns: false, geocode: false, map_codes: false, normalize: false, review: false },
          flagCount: 0,
        }),

      setTargetFormat: (fmt) => set({ targetFormat: fmt }),
    }),
    {
      name: "cat-pipeline-session",
      partialize: (state) => ({
        uploadId: state.uploadId,
        targetFormat: state.targetFormat,
        currentStep: state.currentStep,
        stagesComplete: state.stagesComplete,
        flagCount: state.flagCount,
      }),
    }
  )
);
