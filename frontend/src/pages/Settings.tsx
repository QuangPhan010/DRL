import { Settings as SettingsIcon, Bell, Database, Lock, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3"><SettingsIcon className="h-7 w-7 text-primary" />Cấu hình hệ thống</h1>
        <p className="text-muted-foreground mt-1">Quản lý cài đặt chung của hệ thống điểm rèn luyện.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Học kỳ hiện tại</CardTitle>
            <CardDescription>Cấu hình thời gian đánh giá</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Học kỳ</Label>
              <Select defaultValue="HK1">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="HK1">Học kỳ 1</SelectItem><SelectItem value="HK2">Học kỳ 2</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Năm học</Label><Input defaultValue="2024-2025" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Bắt đầu chấm</Label><Input type="date" defaultValue="2024-12-01" /></div>
              <div className="space-y-2"><Label>Hạn cuối</Label><Input type="date" defaultValue="2024-12-31" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Thông báo</CardTitle>
            <CardDescription>Cấu hình email và thông báo</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {[
              { l: "Thông báo qua email", d: "Gửi email khi có phiếu mới" },
              { l: "Nhắc nhở hạn nộp", d: "Tự động nhắc trước 3 ngày" },
              { l: "Thông báo kết quả", d: "Gửi kết quả duyệt cho sinh viên" },
            ].map(s => (
              <div key={s.l} className="flex items-center justify-between p-3 rounded-lg border">
                <div><p className="font-medium text-sm">{s.l}</p><p className="text-xs text-muted-foreground">{s.d}</p></div>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Bảo mật</CardTitle>
            <CardDescription>Quyền hạn và bảo mật hệ thống</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {[
              { l: "Sinh viên tự đánh giá", d: "Cho phép SV nhập điểm trước" },
              { l: "Yêu cầu duyệt 2 cấp", d: "Cố vấn + Trưởng khoa" },
              { l: "Khoá khi đã duyệt", d: "Không thể sửa sau khi duyệt" },
            ].map(s => (
              <div key={s.l} className="flex items-center justify-between p-3 rounded-lg border">
                <div><p className="font-medium text-sm">{s.l}</p><p className="text-xs text-muted-foreground">{s.d}</p></div>
                <Switch defaultChecked={s.l !== "Sinh viên tự đánh giá"} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Sao lưu dữ liệu</CardTitle>
            <CardDescription>Quản lý sao lưu và phục hồi</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 rounded-xl bg-gradient-card border">
              <p className="text-sm text-muted-foreground">Lần sao lưu gần nhất</p>
              <p className="font-display font-bold mt-1">09/06/2026, 03:00</p>
            </div>
            <Button variant="outline" className="w-full">Sao lưu ngay</Button>
            <Button variant="outline" className="w-full">Xuất toàn bộ dữ liệu</Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2 sticky bottom-4 bg-card/80 backdrop-blur p-3 rounded-xl border shadow-elegant">
        <Button variant="outline">Khôi phục mặc định</Button>
        <Button className="bg-gradient-primary" onClick={() => toast.success("Đã lưu cấu hình")}>Lưu thay đổi</Button>
      </div>
    </div>
  );
}
