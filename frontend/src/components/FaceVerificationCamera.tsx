import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, ScanFace, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FaceVerificationData {
  faceImage: string;
}

interface Props {
  avatar?: string;
  onVerified: (data: FaceVerificationData | null) => void | Promise<void>;
}

export default function FaceVerificationCamera({ avatar, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [message, setMessage] = useState("Mở camera để bắt đầu chụp khuôn mặt.");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  useEffect(() => {
    onVerified(null);
    setCapturedImage(null);
    return stopCamera;
  }, [avatar]);

  const startCamera = async () => {
    if (!avatar) {
      setMessage("Bạn chưa có ảnh đại diện. Hãy cập nhật ảnh tại trang Hồ sơ.");
      return;
    }
    try {
      setBusy(true);
      setMessage("Đang khởi động camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn("Video play interrupted:", playError);
        }
      }
      setCameraActive(true);
      setCapturedImage(null);
      setMessage("Đưa khuôn mặt của bạn đối diện camera và giữ đủ sáng.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể truy cập camera. Vui lòng cấp quyền camera.",
      );
    } finally {
      setBusy(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !avatar) return;
    try {
      setBusy(true);
      onVerified(null);
      setMessage("Đang chụp ảnh...");

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không thể khởi tạo canvas.");
      
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const faceImage = canvas.toDataURL("image/jpeg", 0.9);

      await onVerified({ faceImage });
      setCapturedImage(faceImage);
      setMessage("Đã chụp ảnh khuôn mặt thành công. Vui lòng nhấn nút điểm danh phía dưới.");
      stopCamera();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể chụp ảnh.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-cover scale-x-[-1] ${cameraActive ? "block" : "hidden"}`}
        />
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground">
            {capturedImage ? (
              <img src={capturedImage} alt="Captured preview" className="h-full w-full object-cover scale-x-[-1]" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3">
                <ScanFace className="h-14 w-14" />
                <span className="px-6 text-center text-sm">{message}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {cameraActive ? (
        <Button type="button" className="w-full gap-2 bg-gradient-primary" onClick={captureImage} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
          Chụp ảnh xác thực
        </Button>
      ) : (
        <Button
          type="button"
          variant={!capturedImage ? "default" : "outline"}
          className="w-full gap-2"
          onClick={startCamera}
          disabled={busy || !avatar}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {!capturedImage ? "Mở camera Face ID" : "Chụp lại"}
        </Button>
      )}

      <p className={`flex gap-2 text-xs ${capturedImage ? "text-green-700 font-semibold" : "text-muted-foreground"}`}>
        {!capturedImage && <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
        {message}
      </p>
    </div>
  );
}
