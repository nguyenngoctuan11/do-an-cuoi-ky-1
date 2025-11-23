import httpClient from "../api/httpClient";

export const fetchAdminUsers = (params = {}) => httpClient.get("/api/admin/users", { params });

export const fetchAdminRoles = () => httpClient.get("/api/admin/users/roles");
