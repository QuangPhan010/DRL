import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Home, MapPin, Users, Loader2, Search, SlidersHorizontal, Building2, MonitorPlay } from "lucide-react";
import { API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("all"); // all, small (<50), medium (50-150), large (>=150)

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

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // 1. Search Query Match
      const matchesSearch = 
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.location || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // 2. Capacity Filter Match
      const cap = Number(room.capacity);
      if (capacityFilter === "small") return cap < 50;
      if (capacityFilter === "medium") return cap >= 50 && cap < 150;
      if (capacityFilter === "large") return cap >= 150;
      
      return true;
    });
  }, [rooms, searchQuery, capacityFilter]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = rooms.length;
    const totalCapacity = rooms.reduce((sum, r) => sum + Number(r.capacity), 0);
    const largeRooms = rooms.filter(r => Number(r.capacity) >= 150).length;
    const locations = Array.from(new Set(rooms.map(r => r.location?.split(',')[0]?.trim()).filter(Boolean))).length;
    return { total, totalCapacity, largeRooms, locations };
  }, [rooms]);

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
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-24">
      {/* Top Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
              <Home className="h-5 w-5" />
            </div>
            Quản lý Phòng họp & Hội trường
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Cấu hình danh mục cơ sở vật chất, phục vụ kiểm tra và xếp lịch hoạt động tự động của trường.
          </p>
        </div>
        <Button 
          onClick={handleOpenCreate} 
          className="bg-gradient-primary text-white flex items-center gap-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 h-11 px-5"
        >
          <Plus className="h-5 w-5" />
          Thêm phòng học mới
        </Button>
      </div>

      {/* Stats Counter Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-0 shadow-md bg-gradient-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tổng phòng học</span>
              <p className="font-display text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tổng sức chứa</span>
              <p className="font-display text-2xl font-bold">{stats.totalCapacity} <span className="text-xs text-muted-foreground font-normal">chỗ</span></p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Hội trường lớn (≥150)</span>
              <p className="font-display text-2xl font-bold">{stats.largeRooms}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <MonitorPlay className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Phân khu / Tòa nhà</span>
              <p className="font-display text-2xl font-bold">{stats.locations}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and search control bar */}
      <Card className="border-0 shadow-sm bg-muted/20">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên phòng, vị trí..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-background border-border/80"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mr-2">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Bộ lọc sức chứa:
            </span>
            {[
              { label: "Tất cả", value: "all" },
              { label: "Nhỏ (<50)", value: "small" },
              { label: "Vừa (50-150)", value: "medium" },
              { label: "Lớn (≥150)", value: "large" }
            ].map(filter => (
              <Button
                key={filter.value}
                variant="ghost"
                size="sm"
                onClick={() => setCapacityFilter(filter.value)}
                className={cn(
                  "h-8 text-xs rounded-lg transition-all border px-3",
                  capacityFilter === filter.value 
                    ? "bg-primary text-white border-transparent hover:bg-primary/90 hover:text-white" 
                    : "bg-background hover:bg-muted text-foreground border-border/60 hover:text-foreground"
                )}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rooms Cards Grid Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-background border rounded-2xl shadow-inner">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-semibold">Đang đồng bộ cơ sở vật chất...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card className="border-2 border-dashed p-16 text-center text-muted-foreground rounded-2xl">
          <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <Home className="h-6 w-6 text-muted-foreground/80" />
          </div>
          <CardTitle className="text-lg font-bold mb-1">Không tìm thấy phòng nào</CardTitle>
          <CardDescription className="max-w-xs mx-auto">
            Không tìm thấy phòng học phù hợp với điều kiện tìm kiếm hiện tại của bạn.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => {
            const isLarge = Number(room.capacity) >= 150;
            return (
              <Card 
                key={room.id} 
                className="border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl group flex flex-col justify-between overflow-hidden relative"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                        isLarge ? "bg-orange-500/10 text-orange-500" : "bg-primary/10 text-primary"
                      )}>
                        <Home className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="font-display text-lg font-bold group-hover:text-primary transition-colors">
                          {room.name}
                        </CardTitle>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">
                          {isLarge ? "Hội trường lớn" : "Phòng học thông thường"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm text-foreground bg-muted/30 p-2.5 rounded-xl border border-muted-foreground/5">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-muted-foreground">Sức chứa tối đa:</span>
                      <span className="font-bold text-primary ml-auto">{room.capacity} chỗ ngồi</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-foreground p-2.5">
                      <MapPin className="h-4 w-4 text-muted-foreground/60" />
                      <span className="font-semibold text-muted-foreground">Vị trí khu vực:</span>
                      <span className="font-medium text-foreground ml-auto">{room.location || "Chưa thiết lập"}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 pt-3 border-t mt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleOpenEdit(room)}
                      className="flex-1 rounded-xl h-9 border-border/80 text-xs font-semibold hover:bg-muted hover:text-foreground"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Sửa
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleDelete(room.id)}
                      className="flex-1 rounded-xl h-9 text-xs font-semibold"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Xóa phòng
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Room Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              {editingRoom ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
            </DialogTitle>
            <DialogDescription>
              Nhập cấu hình thông số phòng học để xếp lịch và theo dõi xung đột phòng rèn luyện.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="room-name" className="text-sm font-semibold">Tên phòng *</Label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Hội trường A, Phòng họp CNTT"
                required
                className="h-10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="room-capacity" className="text-sm font-semibold">Sức chứa (chỗ)</Label>
                <Input
                  id="room-capacity"
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Ví dụ: 100"
                  min="1"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-location" className="text-sm font-semibold">Tòa nhà / Phân khu (tùy chọn)</Label>
                <Input
                  id="room-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ví dụ: Tòa A"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl h-10">
                Hủy
              </Button>
              <Button type="submit" className="bg-gradient-primary text-white font-semibold rounded-xl h-10 px-5">
                Lưu lại cấu hình
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
