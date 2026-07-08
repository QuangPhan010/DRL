import { RotateCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ErrorPageProps {
  code?: string | number;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorPage({
  code = "500",
  title = "Có lỗi xảy ra",
  message = "Hệ thống gặp sự cố không mong muốn hoặc lỗi kết nối máy chủ. Vui lòng thử lại sau.",
  onRetry
}: ErrorPageProps) {
  const navigate = useNavigate();

  const handleReload = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleReport = () => {
    toast.success("Cảm ơn bạn đã phản hồi! Sự cố đã được gửi lên ban quản trị hệ thống.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4 py-8">
      <Card className="max-w-md w-full border border-border/50 shadow-elegant bg-gradient-card rounded-2xl overflow-hidden relative">
        {/* Glow accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 to-orange-500" />
        
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-white-500/10 flex items-center justify-center border border-rose-500/20 shadow-inner mb-4 overflow-hidden">
            <img src="/logo.jpg" alt="ITC Logo" className="h-10 w-10 rounded-full object-contain" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-500 font-mono">
            Mã lỗi: {code}
          </span>
          <CardTitle className="font-display text-2xl font-black text-foreground mt-1.5 tracking-tight">
            {title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center px-6 pb-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2.5 px-6 pb-8 border-t pt-5 bg-muted/20">
          <div className="flex gap-3 w-full">
            <Button 
              variant="outline" 
              className="flex-1 h-10 gap-2 border-border/60 hover:bg-accent hover:text-accent-foreground text-foreground rounded-xl font-semibold text-xs sm:text-sm"
              onClick={() => navigate("/")}
            >
              <Home className="h-4 w-4 text-muted-foreground" />
              Trang chủ
            </Button>
            <Button 
              className="flex-1 h-10 gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl shadow-md shadow-rose-500/10 font-semibold text-xs sm:text-sm"
              onClick={handleReload}
            >
              <RotateCw className="h-4 w-4" />
              Tải lại trang
            </Button>
          </div>
          <Button 
            variant="ghost" 
            className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground h-9 gap-1.5 rounded-lg"
            onClick={handleReport}
          >
            <ShieldAlert className="h-4 w-4" />
            Báo cáo sự cố này
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
