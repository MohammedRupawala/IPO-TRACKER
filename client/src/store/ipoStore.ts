import { create } from "zustand";
import apiClient, { extractErrorMessage } from "@/lib/axios";
import { toast } from "sonner";



export type AllotmentStatus = "Awaited" | "Allotted" | "Not-Allotted" | "Not-Applied";

export interface AllotmentItem {
  allotment_id: string;
  member_friendly_name: string;
  pan_num: string;
  ipo_name: string;
  status: AllotmentStatus;
  updated_at: string;
  master_account_owner?: string;
}

export interface IPO {
  id: string;
  name: string;
  value: string;
}

export interface RegistrarIPO {
  name: string;
  value: string;
}

export interface Member {
  id: string;
  name: string;
  pan_no: string;
  dob: string | null;
}

export interface AdminMember extends Member {
  owner_name?: string;
}


interface IPOStoreState {
  allotments: AllotmentItem[];
  adminAllotments: AllotmentItem[];
  adminTotal: number;
  adminMembers: AdminMember[];
  adminMembersTotal: number;
  selectedMemberAllotments: AllotmentItem[];
  ipos: IPO[];
  registrarIPOs: RegistrarIPO[];
  members: Member[];
  isLoadingAllotments: boolean;
  isLoadingAdminAllotments: boolean;
  isLoadingAdminMembers: boolean;
  isLoadingMemberAllotments: boolean;
  isLoadingIPOs: boolean;
  isLoadingRegistrarIPOs: boolean;

  fetchAllotments: () => Promise<void>;
  addMember: (data: { name: string; panNo: string; dob?: string }) => Promise<Member>;
  deleteMember: (memberId: string) => Promise<void>;


  fetchAdminAllotments: (page?: number, limit?: number) => Promise<void>;
  fetchAdminMembers: (page?: number, limit?: number) => Promise<void>;
  fetchMemberAllotments: (pan: string) => Promise<void>;
  fetchIPOs: () => Promise<void>;
  fetchRegistrarIPOs: () => Promise<void>;
  addIPO: (data: { name: string; value: string }) => Promise<IPO>;
  triggerSync: (ipoId: string) => Promise<void>;
  deleteIPO: (ipoId: string) => Promise<void>;
}

export const useIPOStore = create<IPOStoreState>()((set) => ({
  allotments: [],
  adminAllotments: [],
  adminTotal: 0,
  adminMembers: [],
  adminMembersTotal: 0,
  selectedMemberAllotments: [],
  ipos: [],
  registrarIPOs: [],
  members: [],
  isLoadingAllotments: false,
  isLoadingAdminAllotments: false,
  isLoadingAdminMembers: false,
  isLoadingMemberAllotments: false,
  isLoadingIPOs: false,
  isLoadingRegistrarIPOs: false,

  fetchAllotments: async () => {
    set({ isLoadingAllotments: true });
    try {
      const res = await apiClient.get<{ success: boolean; data: AllotmentItem[] }>(
        "/api/users/see-allotment"
      );
      if (res.data.success) {
        set({ allotments: res.data.data });
      }
    } catch (error) {
      toast.error("Failed to load allotments", {
        description: extractErrorMessage(error),
      });
    } finally {
      set({ isLoadingAllotments: false });
    }
  },

  addMember: async (data) => {
    const res = await apiClient.post<{ success: boolean; message: string; data: Member }>(
      "/api/users/add-members",
      data
    );
    return res.data.data;
  },

  fetchAdminAllotments: async (page = 1, limit = 10) => {
    set({ isLoadingAdminAllotments: true });
    try {
      const res = await apiClient.get<{ success: boolean; data: AllotmentItem[]; total: number }>(
        `/api/admin/user-allotment?page=${page}&limit=${limit}`
      );
      set({ adminAllotments: res.data.data, adminTotal: res.data.total || 0 });
    } catch (error) {
      toast.error("Failed to load admin allotments", {
        description: extractErrorMessage(error),
      });
    } finally {
      set({ isLoadingAdminAllotments: false });
    }
  },

  fetchIPOs: async () => {
    set({ isLoadingIPOs: true });
    try {
      const res = await apiClient.get<IPO[]>("/api/admin/ipos");
      set({ ipos: res.data });
    } catch (error) {
      toast.error("Failed to load IPOs", {
        description: extractErrorMessage(error),
      });
    } finally {
      set({ isLoadingIPOs: false });
    }
  },

  fetchRegistrarIPOs: async () => {
    set({ isLoadingRegistrarIPOs: true });
    try {
      const res = await apiClient.get<RegistrarIPO[]>("/api/admin/registrar-ipos");
      set({ registrarIPOs: res.data });
    } catch (error) {
      toast.error("Failed to load live IPO options from registrar", {
        description: extractErrorMessage(error),
      });
    } finally {
      set({ isLoadingRegistrarIPOs: false });
    }
  },

  addIPO: async (data) => {
    const res = await apiClient.post<{ success: boolean; message: string; data: IPO }>(
      "/api/admin/ipos",
      data
    );
    return res.data.data;
  },

  triggerSync: async (ipoId: string) => {
    await apiClient.post("/api/admin/allotments", { ipo_id: ipoId });
  },

  deleteMember: async (memberId: string) => {
    await apiClient.delete(`/api/users/members/${memberId}`);
  },

  deleteIPO: async (ipoId: string) => {
    await apiClient.delete(`/api/admin/ipos/${ipoId}`);
  },

  fetchAdminMembers: async (page = 1, limit = 10) => {
    set({ isLoadingAdminMembers: true });
    try {
      const res = await apiClient.get<{ success: boolean; data: AdminMember[]; total: number }>(
        `/api/admin/members?page=${page}&limit=${limit}`
      );
      set({ adminMembers: res.data.data, adminMembersTotal: res.data.total || 0 });
    } catch (error) {
      toast.error("Failed to load global members", {
        description: extractErrorMessage(error),
      });
    } finally {
      set({ isLoadingAdminMembers: false });
    }
  },

  fetchMemberAllotments: async (pan: string) => {
    set({ isLoadingMemberAllotments: true, selectedMemberAllotments: [] });
    try {
      const res = await apiClient.get<{ success: boolean; data: AllotmentItem[] }>(
        `/api/admin/user-allotment?pan=${pan}&limit=100`
      );
      set({ selectedMemberAllotments: res.data.data });
    } catch (error) {
      toast.error("Failed to load allotments for member", {
        description: extractErrorMessage(error),
      });
    } finally {
      set({ isLoadingMemberAllotments: false });
    }
  },
}));
