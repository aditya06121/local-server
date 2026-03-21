import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});
const authRoutesWithoutRefresh = [
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/refresh-token",
];

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean;
          skipAuthRefresh?: boolean;
          skipAuthRedirect?: boolean;
        })
      | undefined;

    if (!originalRequest) {
      return Promise.reject(err);
    }

    const shouldSkipRefresh =
      originalRequest.skipAuthRefresh ||
      authRoutesWithoutRefresh.some((path) =>
        (originalRequest.url ?? "").includes(path),
      );
    const shouldSkipRedirect = originalRequest.skipAuthRedirect;

    if (
      err.response?.status === 401 &&
      !originalRequest._retry &&
      !shouldSkipRefresh
    ) {
      originalRequest._retry = true;

      try {
        await axios.post(
          "/api/auth/refresh-token",
          {},
          {
            withCredentials: true,
            skipAuthRefresh: true,
            skipAuthRedirect: true,
          },
        );

        return api(originalRequest);
      } catch {
        if (!shouldSkipRedirect && window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }
    }

    return Promise.reject(err);
  },
);
