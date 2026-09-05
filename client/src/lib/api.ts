import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function isApiError(error: unknown): error is { response: { data: ApiError } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response: unknown }).response === 'object' &&
    (error as { response: unknown }).response !== null &&
    'data' in (error as { response: { data: unknown } }).response
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response.data.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
