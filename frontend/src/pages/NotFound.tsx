import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import ErrorPage from "./ErrorPage";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <ErrorPage 
      code="404"
      title="Không tìm thấy trang"
      message="Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển."
    />
  );
};

export default NotFound;
