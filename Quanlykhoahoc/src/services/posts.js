import httpClient from "../api/httpClient";

export const listPublicPosts = (params = {}) => httpClient.get("/api/posts", { params });

export const fetchPostDetail = (slugOrId) => httpClient.get(`/api/posts/${slugOrId}`);

export const listMyPosts = (params = {}) => httpClient.get("/api/posts/my", { params });

export const createPost = (payload) => httpClient.post("/api/posts", payload);

export const updatePost = (postId, payload) => httpClient.put(`/api/posts/${postId}`, payload);

export const listPendingPosts = (params = {}) => httpClient.get("/api/admin/posts/pending", { params });

export const approvePost = (postId) => httpClient.post(`/api/admin/posts/${postId}/approve`);

export const rejectPost = (postId, payload) => httpClient.post(`/api/admin/posts/${postId}/reject`, payload);
