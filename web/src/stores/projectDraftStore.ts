import type { JobType } from "@/types/app";
import { create } from "zustand";

interface ProjectDraftState {
  customerId: string | null;
  locationId: string | null;
  selectedAcIds: string[];
  jobType: JobType | null;
  proposedDate: string | null; // ← NEW ✅ from booking request
  proposedTime: string | null; // ← NEW ✅ from booking request
  isPreFilled: boolean;

  setDraft: (
    customerId: string,
    locationId: string,
    selectedAcIds: string[],
    jobType?: JobType | null,
    proposedDate?: string | null, // ← NEW ✅
    proposedTime?: string | null, // ← NEW ✅
  ) => void;
  clearDraft: () => void;
}

export const useProjectDraftStore = create<ProjectDraftState>((set) => ({
  customerId: null,
  locationId: null,
  selectedAcIds: [],
  jobType: null,
  proposedDate: null,
  proposedTime: null,
  isPreFilled: false,

  setDraft: (
    customerId,
    locationId,
    selectedAcIds,
    jobType = null,
    proposedDate = null,
    proposedTime = null,
  ) =>
    set({
      customerId,
      locationId,
      selectedAcIds,
      jobType,
      proposedDate,
      proposedTime,
      isPreFilled: true,
    }),

  clearDraft: () =>
    set({
      customerId: null,
      locationId: null,
      selectedAcIds: [],
      jobType: null,
      proposedDate: null,
      proposedTime: null,
      isPreFilled: false,
    }),
}));
