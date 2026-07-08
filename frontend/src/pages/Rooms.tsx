import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Home, MapPin, Users, Loader2 } from "lucide-react";
import { API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isOpen, setIsOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("50");
  const [location, setLocation] = useState("");

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/rooms/`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách phòng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setName("");
    setCapacity("50");
    setLocation("");
    setIsOpen(true);
  };

  const handleOpenEdit = (room: any) => {
    setEditingRoom(room);
    setName(room.name);
    setCapacity(String(room.capacity));
    setLocation(room.location || "");
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên phòng.");
      return;
    }

    const payload = {
      name: name.trim(),
      capacity: Number(capacity) || 50,
      location: location.trim() || null
    };

    const token = localStorage.getItem("drl_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const url = editingRoom 
        ? `${API_URL}/rooms/${editingRoom.id}/` 
        : `${API_URL}/rooms/`;
      const method = editingRoom ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingRoom ? "Cập nhật phòng thành công!" : "Tạo phòng mới thành công!");
        setIsOpen(false);
        fetchRooms();
      } else {
        const errData = await res.json();
        toast.error(errData.detail || errData.name?.[0] || "Đã xảy ra lỗi.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phòng này? Các hoạt động liên quan sẽ mất liên kết với phòng.")) {
      return;
    }

    const token = localStorage.getItem("drl_token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_URL}/rooms/${id}/`, {
        method: "DELETE",
        headers
      });

      if (res.status === 204) {
        toast.success("Xóa phòng thành công!");
        fetchRooms();
      } else {
        toast.error("Không thể xóa phòng này.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            Quản lý phòng họp & Hội trường
          </h1>
          <p className="text-sm text-muted-foreground">Thêm, sửa, xóa phòng họp phục vụ xếp lịch hoạt động.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-xl shadow">
          <Plus className="h-4 w-4" />
          Thêm phòng
        </Button>
      </div>

      {/* Rooms Table Card */}
      <Card className="border shadow-md">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base font-bold">Danh sách phòng</CardTitle>
          <CardDescription>Tổng số {rooms.length} phòng đang được quản lý trên hệ thống.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              Không có phòng nào được tìm thấy. Bấm "Thêm phòng" để bắt đầu.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] pl-6">Tên Phòng</TableHead>
                  <TableHead className="w-[120px]">Sức Chứa</TableHead>
                  <TableHead>Vị Trí / Địa Điểm</TableHead>
                  <TableHead className="w-[120px] text-right pr-6">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-bold text-foreground pl-6 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Home className="h-4 w-4" />
                      </div>
                      {room.name}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <Users className="h-3 w-3" />
                        {room.capacity} chỗ
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground flex items-center gap-1.5 py-4">
                      <MapPin className="h-4 w-4 text-muted-foreground/60" />
                      {room.location || "Chưa xác định"}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenEdit(room)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(room.id)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Room Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingRoom ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
            </DialogTitle>
            <DialogDescription>
              Nhập các chi tiết cơ bản của phòng họp hoặc hội trường dưới đây.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="room-name">Tên phòng *</Label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Hội trường A, Phòng họp CNTT"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="room-capacity">Sức chứa (chỗ)</Label>
                <Input
                  id="room-capacity"
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Ví dụ: 100"
                  min="1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-location">Vị trí (tùy chọn)</Label>
                <Input
                  id="room-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ví dụ: Tầng 3, Tòa A"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Lưu lại
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
