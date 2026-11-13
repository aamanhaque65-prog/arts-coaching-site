import axios from "axios";

const apiOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export const api = axios.create({
  baseURL: `${apiOrigin}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

export function getApiError(error) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || (
      error.code === "ECONNABORTED"
        ? "The request timed out. Please try again."
        : "The service could not be reached. Please try again."
    );
  }
  return error instanceof Error ? error.message : "The request could not be completed.";
}
