export interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: number;
}

const SESSION_KEY = "drl_login_gps";

const positionOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 0,
};

const readPosition = () =>
  new Promise<GpsPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Thiết bị không hỗ trợ định vị GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const gps = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: position.timestamp,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(gps));
        resolve(gps);
      },
      (error) => {
        const messages: Record<number, string> = {
          [error.PERMISSION_DENIED]: "Bạn cần cấp quyền vị trí để sử dụng điểm danh Face ID.",
          [error.POSITION_UNAVAILABLE]: "Thiết bị hiện không xác định được vị trí.",
          [error.TIMEOUT]: "Quá thời gian chờ tín hiệu GPS. Vui lòng thử lại.",
        };
        reject(new Error(messages[error.code] || "Không thể lấy vị trí thiết bị."));
      },
      positionOptions,
    );
  });

/** Called after every successful login to request/refresh location permission. */
export const requestLocationAtLogin = async () => {
  sessionStorage.removeItem(SESSION_KEY);
  return readPosition();
};

/** Always obtains a fresh position after face verification. */
export const getFreshAttendanceLocation = () => readPosition();
