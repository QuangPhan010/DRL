
interface LoadingProps {
  message?: string;
}

export default function Loading({ message = "Đang tải dữ liệu hệ thống..." }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer glowing ripple circles */}
        <div className="absolute h-24 w-24 rounded-full border border-primary/20 animate-ping opacity-75" />
        <div className="absolute h-16 w-16 rounded-full border border-accent/30 animate-pulse" />
        
        {/* Main rotating gradient border */}
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary/10 border-t-primary shadow-lg" />
        
        {/* Central logo */}
        <div className="absolute flex items-center justify-center h-10 w-10 bg-card rounded-full shadow-md border border-border/50 overflow-hidden">
          <img src="/logo.jpg" alt="ITC Logo" className="h-7 w-7 rounded-full object-contain animate-pulse" />
        </div>
      </div>
      
      {/* Loading texts */}
      <h3 className="font-display font-bold text-lg text-foreground tracking-tight text-center">
        Vui lòng đợi trong giây lát
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 font-medium animate-pulse text-center max-w-xs">
        {message}
      </p>
    </div>
  );
}
