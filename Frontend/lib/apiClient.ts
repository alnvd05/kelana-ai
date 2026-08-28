import { clearAuthSession, getStoredToken } from "@/lib/authStorage";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);

  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const firstError = detail[0] as { msg?: unknown };
      if (typeof firstError?.msg === "string") return firstError.msg;
    }
  }

  return `Request failed (${response.status})`;
}

type ApiRequestOptions = {
  authenticated?: boolean;
};

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = { authenticated: true },
): Promise<T> {
  const headers = new Headers(init.headers);

  if (options.authenticated !== false) {
    const token = getStoredToken();
    if (!token) {
      clearAuthSession();
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && options.authenticated !== false) {
      clearAuthSession();
    }
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json() as Promise<T>;
}
