import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, Eye, Settings, Key, UserCheck, CalendarDays, RefreshCw } from "lucide-react";

export default function EmailPreview() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("password");

  // Common fields
  const [studentName, setStudentName] = useState("Phan Văn Tấn Quang");
  const [studentId, setStudentId] = useState("SV001");

  // Tab 1: Password fields
  const [tempPassword, setTempPassword] = useState("aBcd1234");

  // Tab 2: Register fields
  const [regActivityName, setRegActivityName] = useState("Hội thảo Nghiên cứu khoa học sinh viên 2026");
  const [regActivityTime, setRegActivityTime] = useState("08:00 - 11:30, Thứ Sáu ngày 10/07/2026");
  const [regActivityLocation, setRegActivityLocation] = useState("Hội trường A, Tầng 3, Tòa nhà Trung tâm");
  const [regActivityPoints, setRegActivityPoints] = useState("5");

  // Tab 3: Checkin/Checkout fields
  const [checkActivityName, setCheckActivityName] = useState("Hiến máu nhân đạo đợt 1 - năm 2026");
  const [checkType, setCheckType] = useState("Check-in");
  const [checkTime, setCheckTime] = useState("08:15:32 - 10/07/2026");

  // Tab 4: Reschedule fields
  const [resActivityName, setResActivityName] = useState("Giải bóng đá Futsal ITC Cup lần V");
  const [resOldTime, setResOldTime] = useState("08:00 ngày 12/07/2026");
  const [resNewTime, setResNewTime] = useState("14:30 ngày 19/07/2026");
  const [rescheduleReason, setRescheduleReason] = useState("Sân bóng đang tiến hành bảo dưỡng mặt cỏ định kỳ.");

  // Template 1: Password Email
  const passwordEmailHtml = `
<div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #3b82f6, #06b6d4); padding: 32px 24px; text-align: center; color: white;">
    <div style="height: 60px; width: 60px; border-radius: 50%; background: white; padding: 4px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <img src="http://localhost:8080/logo.jpg" alt="ITC Logo" style="height: 48px; width: 48px; border-radius: 50%; object-fit: contain;" onerror="this.src='https://ui-avatars.com/api/?name=ITC&background=3b82f6&color=fff'" />
    </div>
    <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">ITC Point</h1>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Hệ Thống Quản Lý Điểm Rèn Luyện Trực Tuyến</p>
  </div>
  <div style="padding: 40px 32px; background-color: #ffffff;">
    <h2 style="margin-top: 0; color: #1e293b; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Chào ${studentName},</h2>
    <p style="color: #475569; line-height: 1.6; font-size: 15px; margin-top: 12px;">Tài khoản đánh giá điểm rèn luyện trực tuyến của bạn đã được thiết lập thành công. Vui lòng sử dụng thông tin đăng nhập tạm thời dưới đây để đăng nhập lần đầu vào hệ thống:</p>
    
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 28px 0; border: 1px solid #f1f5f9; border-left: 4px solid #3b82f6;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: 600; width: 130px; text-transform: uppercase; letter-spacing: 0.5px;">Tên đăng nhập:</td>
          <td style="padding: 6px 0; font-size: 15px; color: #0f172a; font-weight: 700; font-family: monospace;">${studentId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Mật khẩu tạm:</td>
          <td style="padding: 6px 0; font-size: 16px; color: #ef4444; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${tempPassword}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 36px 0 28px 0;">
      <a href="http://localhost:8080/login" style="background: linear-gradient(135deg, #3b82f6, #06b6d4); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3); letter-spacing: -0.2px;">Đăng nhập hệ thống</a>
    </div>

    <div style="background-color: #fef2f2; border-radius: 8px; padding: 14px 18px; border: 1px solid #fee2e2; margin-top: 24px;">
      <p style="color: #b91c1c; font-size: 13px; font-weight: 600; margin: 0; line-height: 1.5;">
        * Quan trọng: Đây là mật khẩu tự động tạm thời. Bạn bắt buộc phải đổi sang mật khẩu bảo mật của riêng mình ngay tại lần đầu đăng nhập.
      </p>
    </div>
  </div>
  <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px; line-height: 1.5;">
    <p style="margin: 0 0 6px 0; font-weight: 500;">Email này được hệ thống ITC Point gửi tự động.</p>
    <p style="margin: 0;">© 2026 ITC Point. All rights reserved.</p>
  </div>
</div>
  `;

  // Template 2: Register Email
  const registerEmailHtml = `
<div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 24px; text-align: center; color: white;">
    <div style="height: 60px; width: 60px; border-radius: 50%; background: white; padding: 4px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <img src="http://localhost:8080/logo.jpg" alt="ITC Logo" style="height: 48px; width: 48px; border-radius: 50%; object-fit: contain;" onerror="this.src='https://ui-avatars.com/api/?name=ITC&background=10b981&color=fff'" />
    </div>
    <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">Đăng Ký Hoạt Động</h1>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Ghi nhận đăng ký tham gia thành công</p>
  </div>
  <div style="padding: 40px 32px; background-color: #ffffff;">
    <h2 style="margin-top: 0; color: #1e293b; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Chào ${studentName},</h2>
    <p style="color: #475569; line-height: 1.6; font-size: 15px; margin-top: 12px;">Hệ thống xác nhận bạn đã đăng ký tham gia hoạt động dưới đây thành công:</p>
    
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 28px 0; border: 1px solid #f1f5f9; border-left: 4px solid #10b981;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; width: 130px; text-transform: uppercase; letter-spacing: 0.5px;">Hoạt động:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #0f172a; font-weight: 700;">${regActivityName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Thời gian:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #0f172a; font-weight: 500;">${regActivityTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Địa điểm:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #0f172a; font-weight: 500;">${regActivityLocation}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Điểm cộng:</td>
          <td style="padding: 8px 0; font-size: 16px; color: #10b981; font-weight: 700;">+${regActivityPoints}đ rèn luyện</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #eff6ff; border-radius: 8px; padding: 14px 18px; border: 1px solid #dbeafe; margin-top: 24px;">
      <p style="color: #1e40af; font-size: 13px; font-weight: 600; margin: 0; line-height: 1.5;">
        * Nhắc nhở: Hãy có mặt đúng giờ và quét mã QR Code để Check-in khi bắt đầu, Check-out khi kết thúc hoạt động nhằm tích lũy điểm rèn luyện.
      </p>
    </div>
  </div>
  <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px; line-height: 1.5;">
    <p style="margin: 0 0 6px 0; font-weight: 500;">Email này được hệ thống ITC Point gửi tự động.</p>
    <p style="margin: 0;">© 2026 ITC Point. All rights reserved.</p>
  </div>
</div>
  `;

  // Template 3: Checkin/Checkout Email
  const checkEmailHtml = `
<div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 24px; text-align: center; color: white;">
    <div style="height: 60px; width: 60px; border-radius: 50%; background: white; padding: 4px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <img src="http://localhost:8080/logo.jpg" alt="ITC Logo" style="height: 48px; width: 48px; border-radius: 50%; object-fit: contain;" onerror="this.src='https://ui-avatars.com/api/?name=ITC&background=f59e0b&color=fff'" />
    </div>
    <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">Xác Nhận Điểm Danh</h1>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Ghi nhận điểm danh hoạt động thành công</p>
  </div>
  <div style="padding: 40px 32px; background-color: #ffffff;">
    <h2 style="margin-top: 0; color: #1e293b; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Chào ${studentName},</h2>
    <p style="color: #475569; line-height: 1.6; font-size: 15px; margin-top: 12px;">Hệ thống ghi nhận bạn đã thực hiện điểm danh thành công với thông tin chi tiết:</p>
    
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 28px 0; border: 1px solid #f1f5f9; border-left: 4px solid #f59e0b;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; width: 130px; text-transform: uppercase; letter-spacing: 0.5px;">Hoạt động:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #0f172a; font-weight: 700;">${checkActivityName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Loại điểm danh:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #d97706; font-weight: 700; text-transform: uppercase;">${checkType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Thời gian quét:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #0f172a; font-weight: 500;">${checkTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Trạng thái:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #10b981; font-weight: 700;">HỢP LỆ</td>
        </tr>
      </table>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
      * Điểm rèn luyện của hoạt động này sẽ được tự động tổng hợp và ghi nhận vào bảng điểm tổng kết sau khi ban tổ chức hoàn tất quy trình xét duyệt hoạt động.
    </p>
  </div>
  <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px; line-height: 1.5;">
    <p style="margin: 0 0 6px 0; font-weight: 500;">Email này được hệ thống ITC Point gửi tự động.</p>
    <p style="margin: 0;">© 2026 ITC Point. All rights reserved.</p>
  </div>
</div>
  `;

  // Template 4: Reschedule Email
  const rescheduleEmailHtml = `
<div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px 24px; text-align: center; color: white;">
    <div style="height: 60px; width: 60px; border-radius: 50%; background: white; padding: 4px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <img src="http://localhost:8080/logo.jpg" alt="ITC Logo" style="height: 48px; width: 48px; border-radius: 50%; object-fit: contain;" onerror="this.src='https://ui-avatars.com/api/?name=ITC&background=ef4444&color=fff'" />
    </div>
    <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">Thay Đổi Lịch Hoạt Động</h1>
    <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500;">Cập nhật lịch tổ chức hoạt động</p>
  </div>
  <div style="padding: 40px 32px; background-color: #ffffff;">
    <h2 style="margin-top: 0; color: #1e293b; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Chào ${studentName},</h2>
    <p style="color: #475569; line-height: 1.6; font-size: 15px; margin-top: 12px;">Ban tổ chức xin thông báo về việc thay đổi thời gian diễn ra của hoạt động bạn đã đăng ký như sau:</p>
    
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 28px 0; border: 1px solid #f1f5f9; border-left: 4px solid #ef4444;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; width: 130px; text-transform: uppercase; letter-spacing: 0.5px;">Hoạt động:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #0f172a; font-weight: 700;">${resActivityName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Lịch cũ:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #ef4444; font-weight: 500; text-decoration: line-through;">${resOldTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Lịch mới:</td>
          <td style="padding: 8px 0; font-size: 15px; color: #10b981; font-weight: 700;">${resNewTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Lý do dời:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #475569; line-height: 1.5;">${rescheduleReason}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #fef2f2; border-radius: 8px; padding: 14px 18px; border: 1px solid #fee2e2; margin-top: 24px;">
      <p style="color: #b91c1c; font-size: 13px; font-weight: 600; margin: 0; line-height: 1.5;">
        * Lưu ý: Ban tổ chức xin lỗi vì sự bất tiện này. Mong bạn sắp xếp thời gian để tham gia hoạt động đầy đủ theo lịch trình mới.
      </p>
    </div>
  </div>
  <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px; line-height: 1.5;">
    <p style="margin: 0 0 6px 0; font-weight: 500;">Email này được hệ thống ITC Point gửi tự động.</p>
    <p style="margin: 0;">© 2026 ITC Point. All rights reserved.</p>
  </div>
</div>
  `;

  // Get current active HTML email template
  const getActiveHtml = () => {
    switch (activeTab) {
      case "password":
        return passwordEmailHtml;
      case "register":
        return registerEmailHtml;
      case "check":
        return checkEmailHtml;
      case "reschedule":
        return rescheduleEmailHtml;
      default:
        return passwordEmailHtml;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* Top Header */}
      <header className="bg-background border-b border-border/60 sticky top-0 z-30 px-6 py-4 flex items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Xem trước Email Template
            </h1>
            <p className="text-xs text-muted-foreground">Tùy biến dữ liệu và xem trước các mẫu thư tự động</p>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b pb-4">
            <TabsList className="bg-background border shadow-sm p-1 gap-1">
              <TabsTrigger value="password" className="flex items-center gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2">
                <Key className="h-4 w-4" />
                Cấp mật khẩu
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 rounded-lg px-4 py-2">
                <CalendarDays className="h-4 w-4" />
                Đăng ký hoạt động
              </TabsTrigger>
              <TabsTrigger value="check" className="flex items-center gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 rounded-lg px-4 py-2">
                <UserCheck className="h-4 w-4" />
                Check-in/out
              </TabsTrigger>
              <TabsTrigger value="reschedule" className="flex items-center gap-1.5 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-600 rounded-lg px-4 py-2">
                <RefreshCw className="h-4 w-4" />
                Dời hoạt động
              </TabsTrigger>
            </TabsList>
            <span className="text-xs text-muted-foreground bg-background px-3 py-1.5 border rounded-full shadow-inner font-mono">
              Mode: Live Template Preview
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            {/* Left Controls Column */}
            <div className="space-y-6">
              <Card className="border shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="h-4 w-4 text-primary" />
                    Cấu hình thông tin
                  </CardTitle>
                  <CardDescription>Cập nhật các tham số để kiểm tra hiển thị trên thư gửi đi.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Common fields */}
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Tên sinh viên</Label>
                    <Input
                      id="student-name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Nhập tên sinh viên..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-id">Mã số sinh viên (MSSV)</Label>
                    <Input
                      id="student-id"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="Nhập MSSV..."
                    />
                  </div>

                  {/* Tab specific fields */}
                  <TabsContent value="password" className="m-0 space-y-4">
                    <div className="space-y-2 border-t pt-4 mt-2">
                      <Label htmlFor="temp-password">Mật khẩu tạm thời</Label>
                      <Input
                        id="temp-password"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        placeholder="Nhập mật khẩu..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="register" className="m-0 space-y-4">
                    <div className="space-y-2 border-t pt-4 mt-2">
                      <Label htmlFor="reg-activity">Tên hoạt động</Label>
                      <Input
                        id="reg-activity"
                        value={regActivityName}
                        onChange={(e) => setRegActivityName(e.target.value)}
                        placeholder="Nhập tên hoạt động..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-time">Thời gian diễn ra</Label>
                      <Input
                        id="reg-time"
                        value={regActivityTime}
                        onChange={(e) => setRegActivityTime(e.target.value)}
                        placeholder="Nhập thời gian..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-location">Địa điểm</Label>
                      <Input
                        id="reg-location"
                        value={regActivityLocation}
                        onChange={(e) => setRegActivityLocation(e.target.value)}
                        placeholder="Nhập địa điểm..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-points">Điểm rèn luyện cộng</Label>
                      <Input
                        id="reg-points"
                        value={regActivityPoints}
                        onChange={(e) => setRegActivityPoints(e.target.value)}
                        placeholder="Nhập số điểm..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="check" className="m-0 space-y-4">
                    <div className="space-y-2 border-t pt-4 mt-2">
                      <Label htmlFor="check-activity">Tên hoạt động</Label>
                      <Input
                        id="check-activity"
                        value={checkActivityName}
                        onChange={(e) => setCheckActivityName(e.target.value)}
                        placeholder="Nhập tên hoạt động..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loại điểm danh</Label>
                      <Select value={checkType} onValueChange={setCheckType}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Check-in">Check-in</SelectItem>
                          <SelectItem value="Check-out">Check-out</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-time">Thời gian quét</Label>
                      <Input
                        id="check-time"
                        value={checkTime}
                        onChange={(e) => setCheckTime(e.target.value)}
                        placeholder="Nhập thời gian quét..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="reschedule" className="m-0 space-y-4">
                    <div className="space-y-2 border-t pt-4 mt-2">
                      <Label htmlFor="res-activity">Tên hoạt động</Label>
                      <Input
                        id="res-activity"
                        value={resActivityName}
                        onChange={(e) => setResActivityName(e.target.value)}
                        placeholder="Nhập tên hoạt động..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="res-old-time">Thời gian cũ</Label>
                      <Input
                        id="res-old-time"
                        value={resOldTime}
                        onChange={(e) => setResOldTime(e.target.value)}
                        placeholder="Nhập thời gian cũ..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="res-new-time">Thời gian mới</Label>
                      <Input
                        id="res-new-time"
                        value={resNewTime}
                        onChange={(e) => setResNewTime(e.target.value)}
                        placeholder="Nhập thời gian mới..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="res-reason">Lý do điều chỉnh</Label>
                      <Textarea
                        id="res-reason"
                        rows={3}
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        placeholder="Nhập lý do dời..."
                      />
                    </div>
                  </TabsContent>
                </CardContent>
              </Card>
            </div>

            {/* Right Live Preview Column */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Eye className="h-4 w-4" />
                Bản xem trước thư gửi đi
              </div>
              <Card className="border shadow-md p-6 bg-slate-100/50 flex justify-center items-start overflow-y-auto min-h-[500px]">
                <div 
                  className="w-full max-w-[600px] my-4" 
                  dangerouslySetInnerHTML={{ __html: getActiveHtml() }} 
                />
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
