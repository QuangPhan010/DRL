import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, ScanFace, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  compareFaces,
  detectFaceFromDataUrl,
  detectFaceFromVideo,
  loadFaceModels,
} from "@/lib/face-recognition";

export interface FaceVerificationData {
  faceEmbedding: number[];
  faceLiveness: number;
  faceRealness: number;
  faceSimilarity: number;
}

interface Props {
  avatar?: string;
  onVerified: (data: FaceVerificationData | null) => void | Promise<void>;
}

const MATCH_THRESHOLD = 0.55;
const PRESENTATION_THRESHOLD = 0.6;

export default function FaceVerificationCamera({ avatar, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifiedSimilarity, setVerifiedSimilarity] = useState<number | null>(null);
  const [message, setMessage] = useState("Mở camera để bắt đầu quét khuôn mặt.");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  useEffect(() => {
    onVerified(null);
    setVerifiedSimilarity(null);
    return stopCamera;
  }, [avatar]);

  const startCamera = async () => {
    if (!avatar) {
      setMessage("Bạn chưa có ảnh đại diện. Hãy cập nhật ảnh tại trang Hồ sơ.");
      return;
    }
    try {
      setBusy(true);
      setMessage("Đang tải bộ nhận diện khuôn mặt...");
      await loadFaceModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setMessage("Đưa khuôn mặt vào giữa khung, nhìn thẳng và giữ đủ sáng.");
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

  const verify = async () => {
    if (!videoRef.current || !avatar) return;
    try {
      setBusy(true);
      onVerified(null);
      setVerifiedSimilarity(null);
      setMessage("Đang kiểm tra khuôn mặt và tự động xác định vị trí...");
      const [reference, scanned] = await Promise.all([
        detectFaceFromDataUrl(avatar),
        detectFaceFromVideo(videoRef.current),
      ]);
      const similarity = compareFaces(reference.embedding, scanned.embedding);

      if (
        scanned.liveness < PRESENTATION_THRESHOLD ||
        scanned.realness < PRESENTATION_THRESHOLD
      ) {
        throw new Error("Không xác nhận được khuôn mặt thật. Không dùng ảnh chụp hoặc màn hình khác.");
      }
      if (similarity < MATCH_THRESHOLD) {
        throw new Error(`Khuôn mặt không khớp ảnh đại diện (${Math.round(similarity * 100)}%).`);
      }

      await onVerified({
        faceEmbedding: scanned.embedding,
        faceLiveness: scanned.liveness,
        faceRealness: scanned.realness,
        faceSimilarity: similarity,
      });
      setVerifiedSimilarity(similarity);
      setMessage(`Face ID và GPS hợp lệ — độ tương đồng ${Math.round(similarity * 100)}%.`);
      stopCamera();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xác thực khuôn mặt.");
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted text-muted-foreground">
            {verifiedSimilarity !== null ? (
              <CheckCircle2 className="h-14 w-14 text-green-600" />
            ) : (
              <ScanFace className="h-14 w-14" />
            )}
            <span className="px-6 text-center text-sm">{message}</span>
          </div>
        )}
        {cameraActive && (
          <div className="pointer-events-none absolute inset-[12%] rounded-[45%] border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,.25)]" />
        )}
      </div>

      {cameraActive ? (
        <Button type="button" className="w-full gap-2" onClick={verify} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
          Quét và xác thực
        </Button>
      ) : (
        <Button
          type="button"
          variant={verifiedSimilarity === null ? "default" : "outline"}
          className="w-full gap-2"
          onClick={startCamera}
          disabled={busy || !avatar}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {verifiedSimilarity === null ? "Mở camera Face ID" : "Quét lại"}
        </Button>
      )}

      <p className={`flex gap-2 text-xs ${verifiedSimilarity !== null ? "text-green-700" : "text-muted-foreground"}`}>
        {verifiedSimilarity !== null ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        {message}
      </p>
    </div>
  );
}
