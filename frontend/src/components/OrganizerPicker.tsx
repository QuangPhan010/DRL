import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Plus } from "lucide-react";
import { API_URL } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Organization {
  id: number;
  name: string;
  type: string;
}

const organizationTypes = [
  "Đoàn - Hội",
  "CLB",
  "Khoa",
  "Phòng/Ban",
  "Đơn vị ngoài trường",
  "Khác",
];

interface OrganizerPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  defaultNewType?: string;
}

export function OrganizerPicker({
  value,
  onChange,
  label = "Đơn vị tổ chức",
  required = true,
  defaultNewType = "Đơn vị ngoài trường",
}: OrganizerPickerProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(defaultNewType);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("drl_token");
      const response = await fetch(`${API_URL}/organizations/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) setOrganizations(await response.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
    const refresh = () => loadOrganizations();
    window.addEventListener("organizations-updated", refresh);
    return () => window.removeEventListener("organizations-updated", refresh);
  }, []);

  const selectedExists = useMemo(
    () => organizations.some(item => item.name === value),
    [organizations, value],
  );

  useEffect(() => {
    if (!loading && value && !selectedExists) {
      setCreating(true);
      setNewName(value);
    }
  }, [loading, selectedExists, value]);

  const createOrganization = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên đơn vị tổ chức.");
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem("drl_token");
      const response = await fetch(`${API_URL}/organizations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, type: newType }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.name) ? data.name[0] : data?.name;
        throw new Error(message || data?.detail || "Không thể thêm đơn vị tổ chức.");
      }
      setOrganizations(current => [...current, data].sort((a, b) => a.name.localeCompare(b.name, "vi")));
      onChange(data.name);
      setCreating(false);
      setNewName("");
      toast.success("Đã thêm đơn vị tổ chức mới.");
      window.dispatchEvent(new Event("organizations-updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm đơn vị tổ chức.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select
        value={creating ? "__new__" : (selectedExists ? value : "")}
        onValueChange={(nextValue) => {
          if (nextValue === "__new__") {
            setCreating(true);
            setNewName("");
            onChange("");
          } else {
            setCreating(false);
            onChange(nextValue);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Đang tải đơn vị..." : "Chọn đơn vị tổ chức"} />
        </SelectTrigger>
        <SelectContent>
          {organizations.map(organization => (
            <SelectItem key={organization.id} value={organization.name}>
              {organization.name} · {organization.type}
            </SelectItem>
          ))}
          <SelectItem value="__new__">
            <span className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" /> Thêm đơn vị mới
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {creating && (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nhập tên đơn vị mới..."
            />
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {organizationTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" onClick={createOrganization} disabled={saving}>
            {saving
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Building2 className="mr-2 h-4 w-4" />}
            Lưu vào danh mục đơn vị
          </Button>
        </div>
      )}
    </div>
  );
}
