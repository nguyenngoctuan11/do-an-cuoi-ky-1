import httpClient from "../api/httpClient";

export const login = (payload) => httpClient.post("/api/auth/login", payload);

export const fetchMe = () => httpClient.get("/api/auth/me");
