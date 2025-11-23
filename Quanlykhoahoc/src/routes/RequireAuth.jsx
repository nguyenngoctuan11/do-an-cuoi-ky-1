import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children, roles }) {
  const location = useLocation();
  const { isAuthenticated, initialised, user } = useAuth();

  if (!initialised) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-sm text-stone-500">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (Array.isArray(roles) && roles.length > 0) {
    const normalizedRequired = roles.map((role) => String(role).toUpperCase());
    const userRoles = (user?.roles || []).map((role) => String(role).toUpperCase());
    const allowed = userRoles.some((role) => normalizedRequired.includes(role));
    if (!allowed) {
      return (
        <div className="min-h-[60vh] grid place-items-center px-4 text-center text-sm text-stone-500">
          Bạn không có quyền truy cập chức năng này.
        </div>
      );
    }
  }

  return children;
}
