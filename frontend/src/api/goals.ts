// IMPROVED goals.ts (v0)
import axios from "axios";

// NEW - Contribution Ledger Interface:
export interface Contribution {
  amount: number;
  type: "deposit" | "withdrawal";
  timestamp?: string;
}
export interface Goal {
  id?: string;
  name: string;
  description: string;
  category: string;
  colour: string;
  targetValue: number;
  currentValue: number;
  completed?: boolean;
  // NEW - Contribution Ledger Logic:
  contributions?: Contribution[]; // Optional array to track contributions
}

// Use environment variable or fallback to localhost for development
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Create an Axios instance with credentials included
const api = axios.create({
  baseURL: `${API_BASE_URL}/goals`,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export const getGoals = () => api.get<Goal[]>("/");
export const createGoal = (goal: Goal) => api.post<Goal>("/", goal);
export const updateGoal = (id: string, goal: Partial<Goal>) =>
  api.put<Goal>(`/${id}`, goal);
export const deleteGoal = (id: string) => api.delete<{ msg: string }>(`/${id}`);
export const completeGoal = (id: string) => api.put<Goal>(`/${id}/complete`);

export const getCurrentUser = () =>
  axios.get(`${API_BASE_URL}/auth/me`, { withCredentials: true });

export const logout = () =>
  axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });

// NEW - Contribution Ledger API Calls:
export const addContribution = (
  id: string,
  payload: { amount: number; type: "deposit" | "withdrawal" },
) => api.post<Goal>(`/${id}/contributions`, payload);
