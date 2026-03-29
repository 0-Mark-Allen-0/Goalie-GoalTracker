// frontend/src/api/goals.ts
import axios from "axios";

// --- INTERFACES ---

export interface Contribution {
  id?: string;
  amount: number;
  type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out";
  referenceId?: string; // Used for linking transfers
  timestamp?: string;
}

export interface Bucket {
  id?: string;
  name: string;
  type: string;
  totalBalance: number;
  unallocatedFunds?: number; // Derived from backend
  userId?: string;
  contributions?: Contribution[];
}

export interface Goal {
  id?: string;
  bucketId: string; // NEW - Strictly Required
  name: string;
  description: string;
  category: string;
  colour: string;
  targetValue: number;
  currentValue: number;
  completed?: boolean;
  contributions?: Contribution[];
}

// --- API CONFIG ---

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Root API instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

// --- AUTH ---
export const getCurrentUser = () => api.get(`/auth/me`);
export const logout = () => api.post(`/auth/logout`, {});

// --- GOALS ---
export const getGoals = () => api.get<Goal[]>("/goals/");
export const createGoal = (goal: Partial<Goal>) =>
  api.post<Goal>("/goals/", goal);
export const updateGoal = (id: string, goal: Partial<Goal>) =>
  api.put<Goal>(`/goals/${id}`, goal);
export const deleteGoal = (id: string) =>
  api.delete<{ msg: string }>(`/goals/${id}`);
export const completeGoal = (id: string) =>
  api.put<Goal>(`/goals/${id}/complete`);

// --- BUCKETS (NEW) ---
export const getBuckets = () => api.get<Bucket[]>("/buckets/");
export const createBucket = (bucket: Partial<Bucket>) =>
  api.post<Bucket>("/buckets/", bucket);
export const updateBucket = (id: string, bucket: Partial<Bucket>) =>
  api.put<Bucket>(`/buckets/${id}`, bucket);
export const deleteBucket = (id: string) =>
  api.delete<{ message: string }>(`/buckets/${id}`);

// --- TRANSACTIONS (NEW) ---
export const allocateToGoal = (
  id: string,
  payload: { amount: number; type: "deposit" | "withdrawal" },
) => api.post<Goal>(`/transactions/goal/${id}/contribute`, payload);

export const withdrawFromBucket = (id: string, payload: { amount: number }) =>
  api.post<{ message: string }>(`/transactions/bucket/${id}/withdraw`, payload);

export const transferBetweenGoals = (payload: {
  sourceId: string;
  targetId: string;
  amount: number;
}) =>
  api.post<{
    message: string;
    requested: number;
    transferred: number;
    overflow_prevented: number;
  }>(`/transactions/transfer/goal-to-goal`, payload);
