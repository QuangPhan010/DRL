import { useEffect, useMemo, useState } from "react";
import { Building2, Edit, Loader2, Plus, Search, Trash2, Users } from "lucide-react";
import { API_URL } from "@/contexts/AuthContext";
import { normalizeSearch } from "@/lib/search";
import { getOrganizerStyle } from "@/lib/organizer-highlight";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Organization {
  id: number;
  name: string;
  type: string;
  member_count: number;
  activity_count: number;
}

const organizationTypes = [
  "Đoàn - Hội",
  "CLB",
  "Khoa",
  "Phòng/Ban",
  "Đơn vị ngoài trường",
  "Khác",
];

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("Đơn vị ngoài trường");

  const requestHeaders = () => {
    const token = localStorage.getItem("drl_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/organizations/`, {
        headers: requestHeaders(),
      });
      if (!response.ok) throw new Error("Không tải được danh sách đơn vị.");
      setOrganizations(await response.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được danh sách đơn vị.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const filteredOrganizations = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return organizations;
    return organizations.filter(organization =>
      normalizeSearch(`${organization.name} ${organization.type}`).includes(query)
    );
  }, [organizations, search]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setType("Đơn vị ngoài trường");
    setDialogOpen(true);
  };

  const openEdit = (organization: Organization) => {
    setEditing(organization);
    setName(organization.name);
    setType(organization.type);
    setDialogOpen(true);
  };

  const saveOrganization = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên đơn vị.");
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(
        editing
          ? `${API_URL}/organizations/${editing.id}/`
          : `${API_URL}/organizations/`,
        {
          method: editing ? "PATCH" : "POST",
          headers: requestHeaders(),
          body: JSON.stringify({ name: name.trim(), type }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.name) ? data.name[0] : data?.name;
        throw new Error(message || data?.detail || "Không thể lưu đơn vị.");
      }
      toast.success(editing ? "Đã cập nhật đơn vị tổ chức." : "Đã thêm đơn vị tổ chức.");
      setDialogOpen(false);
      await loadOrganizations();
      window.dispatchEvent(new Event("organizations-updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu đơn vị.");
    } finally {
      setSaving(false);
    }
  };

  const deleteOrganization = async (organization: Organization) => {
    if (!window.confirm(`Bạn có chắc muốn xóa đơn vị “${organization.name}”?`)) return;
    try {
      const response = await fetch(`${API_URL}/organizations/${organization.id}/`, {
        method: "DELETE",
        headers: requestHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || "Không thể xóa đơn vị.");
      }
      toast.success("Đã xóa đơn vị tổ chức.");
      setOrganizations(current => current.filter(item => item.id !== organization.id));
      window.dispatchEvent(new Event("organizations-updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa đơn vị.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-bold">
            <Building2 className="h-7 w-7 text-primary" /> Quản lý đơn vị tổ chức
          </h1>
          <p className="mt-1 text-muted-foreground">
            Danh mục dùng chung khi tạo hoạt động và highlight theo đơn vị tổ chức.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary">
          <Plus className="h-4 w-4" /> Thêm đơn vị
        </Button>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg">Danh sách đơn vị</CardTitle>
            <CardDescription>{filteredOrganizations.length}/{organizations.length} đơn vị</CardDescription>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Tìm theo tên hoặc loại đơn vị..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên đơn vị</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Thành viên</TableHead>
                <TableHead>Hoạt động sử dụng</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline h-5 w-5 animate-spin" /> Đang tải...
                  </TableCell>
                </TableRow>
              ) : filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                    Chưa có đơn vị tổ chức phù hợp.
                  </TableCell>
                </TableRow>
              ) : filteredOrganizations.map(organization => {
                const style = getOrganizerStyle(organization.name);
                return (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <span className={cn("h-3 w-3 rounded-full", style.dot)} />
                        {organization.name}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={style.badge}>{organization.type}</Badge></TableCell>
                    <TableCell><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{organization.member_count}</span></TableCell>
                    <TableCell>{organization.activity_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(organization)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteOrganization(organization)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Chỉnh sửa đơn vị tổ chức" : "Thêm đơn vị tổ chức"}</DialogTitle>
            <DialogDescription>
              Đơn vị sau khi lưu sẽ xuất hiện trong form tạo hoạt động và bộ highlight.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tên đơn vị</Label>
              <Input value={name} onChange={event => setName(event.target.value)} placeholder="Ví dụ: Đoàn Thanh Niên" />
            </div>
            <div className="space-y-2">
              <Label>Loại đơn vị</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {organizationTypes.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={saveOrganization} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Cập nhật" : "Thêm đơn vị"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
