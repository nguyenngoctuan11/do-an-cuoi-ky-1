export function extractErrorMessage(payload, fallback = "Có lỗi xảy ra. Vui lòng thử lại.") {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (payload instanceof Error && typeof payload.message === "string") return payload.message;
  if (typeof payload.message === "string") return payload.message;
  if (typeof payload.error === "string") return payload.error;
  if (typeof payload === "object") {
    try {
      return JSON.stringify(payload);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
