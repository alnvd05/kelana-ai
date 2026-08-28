import { apiRequest } from "@/lib/apiClient";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
};

export type RegisterDetails = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  id: number;
  name: string;
  email: string;
};

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  total_trips: number;
};

export function requestLogin(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    "/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    },
    { authenticated: false },
  );
}

export function requestRegister(details: RegisterDetails): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>(
    "/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    },
    { authenticated: false },
  );
}

export function requestCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me");
}
