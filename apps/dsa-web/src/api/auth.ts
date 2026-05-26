import apiClient from "./index";

export type AuthStatusResponse = {
  authEnabled: boolean;
  loggedIn: boolean;
  role?: string;
  username?: string;
};

export type UserInfoResponse = {
  id: number;
  username: string;
  email: string | null;
  role: string;
  is_active: boolean;
};

export const authApi = {
  async getStatus(): Promise<AuthStatusResponse> {
    const { data } = await apiClient.get<AuthStatusResponse>(
      "/api/v1/auth/status",
    );
    return data;
  },

  async login(username: string, password: string): Promise<void> {
    await apiClient.post("/api/v1/auth/login", { username, password });
  },

  async register(
    username: string,
    password: string,
    passwordConfirm: string,
    email?: string,
  ): Promise<void> {
    await apiClient.post("/api/v1/auth/register", {
      username,
      password,
      passwordConfirm,
      email,
    });
  },

  async getMe(): Promise<UserInfoResponse> {
    const { data } = await apiClient.get<UserInfoResponse>("/api/v1/auth/me");
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/v1/auth/logout");
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirm: string,
  ): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(
      "/api/v1/auth/change-password",
      {
        currentPassword,
        newPassword,
        newPasswordConfirm,
      },
    );
    return data;
  },
};
