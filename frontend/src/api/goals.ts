// // // src/api/goals.ts
// // import axios from "axios";

// // // UPDATE - New 'completed' attribute - Allows to track goal history

// // // UPDATE 2 - Login endpoint integration

// // export interface Goal {
// //   id?: string;
// //   name: string;
// //   description: string;
// //   category: string;
// //   colour: string;
// //   targetValue: number;
// //   currentValue: number;
// //   // NEW
// //   completed?: boolean;
// // }

// // const API = "http://localhost:8000/goals"; // use http not https unless you setup SSL

// // export const getGoals = () => axios.get<Goal[]>(API);
// // export const createGoal = (goal: Goal) => axios.post<Goal>(API, goal);
// // export const updateGoal = (id: string, goal: Partial<Goal>) =>
// //   axios.put<Goal>(`${API}/${id}`, goal);
// // export const deleteGoal = (id: string) =>
// //   axios.delete<{ msg: string }>(`${API}/${id}`);
// // // NEW
// // export const completeGoal = (id: string) =>
// //   axios.put<Goal>(`${API}/${id}/complete`);

// import axios from "axios";

// // UPDATE - New 'completed' attribute - Allows to track goal history

// export interface Goal {
//   id?: string;
//   name: string;
//   description: string;
//   category: string;
//   colour: string;
//   targetValue: number;
//   currentValue: number;
//   // NEW
//   completed?: boolean;
// }

// // Create an Axios instance with credentials included
// const api = axios.create({
//   baseURL: "http://localhost:8000/goals", // use http not https unless you setup SSL
//   withCredentials: true,
// });

// export const getGoals = () => api.get<Goal[]>("/");
// export const createGoal = (goal: Goal) => api.post<Goal>("/", goal);
// export const updateGoal = (id: string, goal: Partial<Goal>) =>
//   api.put<Goal>(`/${id}`, goal);
// export const deleteGoal = (id: string) => api.delete<{ msg: string }>(`/${id}`);
// export const completeGoal = (id: string) => api.put<Goal>(`/${id}/complete`);

// IMPROVED goals.ts (v0)
import axios from "axios";

export interface Goal {
  id?: string;
  name: string;
  description: string;
  category: string;
  colour: string;
  targetValue: number;
  currentValue: number;
  completed?: boolean;
}

// Create an Axios instance with credentials included
const api = axios.create({
  baseURL: "http://localhost:8000/goals",
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
  }
);

export const getGoals = () => api.get<Goal[]>("/");
export const createGoal = (goal: Goal) => api.post<Goal>("/", goal);
export const updateGoal = (id: string, goal: Partial<Goal>) =>
  api.put<Goal>(`/${id}`, goal);
export const deleteGoal = (id: string) => api.delete<{ msg: string }>(`/${id}`);
export const completeGoal = (id: string) => api.put<Goal>(`/${id}/complete`);

export const getCurrentUser = () =>
  axios.get("http://localhost:8000/auth/me", { withCredentials: true });

export const logout = () =>
  axios.post(
    "http://localhost:8000/auth/logout",
    {},
    { withCredentials: true }
  );
