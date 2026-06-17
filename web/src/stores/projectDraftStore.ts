import { create } from "zustand";

interface ProjectDraftState {
  customerId: string | null;
  locationId: string | null;
  selectedAcIds: string[];
  isPreFilled: boolean;

  setDraft: (
    customerId: string,
    locationId: string,
    selectedAcIds: string[],
  ) => void;
  clearDraft: () => void;
}

export const useProjectDraftStore = create<ProjectDraftState>((set) => ({
  customerId: null,
  locationId: null,
  selectedAcIds: [],
  isPreFilled: false,

  setDraft: (customerId, locationId, selectedAcIds) =>
    set({
      customerId,
      locationId,
      selectedAcIds,
      isPreFilled: true,
    }),

  clearDraft: () =>
    set({
      customerId: null,
      locationId: null,
      selectedAcIds: [],
      isPreFilled: false,
    }),
}));
