import {
  ApiResponse,
  Department,
  PaginatedUsers,
  UpdateProfilePayload,
  UserDirectoryFilters,
  UserProfile,
} from "@/types";
import {
  apiEndpoints,
  BackendPaginatedUsers,
  BackendUserResponse,
  requestApi,
  requestApiForm,
  respond,
  toFrontendUserProfile,
  USER_ADMIN_UNAVAILABLE_MESSAGE,
  wrapBackendResponse,
} from "./core";
import { t } from "@/lib/i18n";

export const userApi = {
  async getDepartments(): Promise<ApiResponse<Department[]>> {
    try {
      const result = await requestApi<Department[]>({ method: "GET", path: "/api/departments" });
      return wrapBackendResponse(result.data);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : t("Không thể tải danh sách phòng ban."),
      );
    }
  },

  async list(viewer?: UserProfile | null): Promise<ApiResponse<UserProfile[]>> {
    void viewer;
    try {
      const searchParams = new URLSearchParams();
      searchParams.append("page_size", "100");
      const endpoint = { ...apiEndpoints.users.list };
      endpoint.path += `?${searchParams.toString()}`;

      const result = await requestApi<BackendPaginatedUsers>(endpoint);
      return wrapBackendResponse(result.data.items.map(toFrontendUserProfile));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : USER_ADMIN_UNAVAILABLE_MESSAGE);
    }
  },

  async listDirectory(
    filters?: UserDirectoryFilters,
    viewer?: UserProfile | null,
  ): Promise<ApiResponse<PaginatedUsers>> {
    void viewer;
    const searchParams = new URLSearchParams();
    if (filters?.search) searchParams.append("search", filters.search);
    if (filters?.status && filters.status !== "ALL") searchParams.append("status", filters.status);
    if (filters?.role && filters.role !== "ALL") searchParams.append("role", filters.role);
    if (filters?.department && filters.department !== "ALL")
      searchParams.append("department", filters.department);
    const requestedPage = filters?.page ?? 1;
    const requestedPageSize = filters?.pageSize ?? 10;
    searchParams.append("page", requestedPage.toString());
    searchParams.append("page_size", requestedPageSize.toString());

    const endpoint = { ...apiEndpoints.users.list };
    endpoint.path += `?${searchParams.toString()}`;

    try {
      const result = await requestApi<BackendPaginatedUsers>(endpoint);
      return wrapBackendResponse({
        items: result.data.items.map(toFrontendUserProfile),
        total: result.data.total,
        page: result.data.page,
        pageSize: result.data.pageSize,
        totalPages: result.data.totalPages,
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : USER_ADMIN_UNAVAILABLE_MESSAGE);
    }
  },

  async getCurrentProfile(viewer?: UserProfile | null): Promise<ApiResponse<UserProfile>> {
    try {
      const result = await requestApi<BackendUserResponse>(apiEndpoints.auth.me);
      return wrapBackendResponse(toFrontendUserProfile(result.data));
    } catch (error) {
      if (viewer) return respond(viewer, 100);
      throw error;
    }
  },

  async updateCurrentProfile(viewer: UserProfile, payload: UpdateProfilePayload) {
    const result = await requestApi<BackendUserResponse>(apiEndpoints.users.updateProfile, {
      body: JSON.stringify({ name: payload.name }),
    });
    return wrapBackendResponse(toFrontendUserProfile(result.data));
  },

  /** Tải ảnh đại diện (đã cắt vuông) lên Azure Blob qua backend. */
  async uploadAvatar(file: Blob) {
    const form = new FormData();
    form.append("file", file, "avatar");
    const result = await requestApiForm<BackendUserResponse>(apiEndpoints.users.updateAvatar, form);
    return wrapBackendResponse(toFrontendUserProfile(result.data));
  },

  /** Quay về ảnh mặc định (default.png). */
  async resetAvatar() {
    const result = await requestApi<BackendUserResponse>(apiEndpoints.users.resetAvatar);
    return wrapBackendResponse(toFrontendUserProfile(result.data));
  },

  async updatePhone(phoneNumber: string) {
    const result = await requestApi<BackendUserResponse>(apiEndpoints.users.updatePhone, {
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
    const updatedUser = toFrontendUserProfile(result.data);
    return wrapBackendResponse(updatedUser);
  },
};
