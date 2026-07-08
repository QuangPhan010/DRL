import { useState, useEffect, useMemo } from "react";
import { Sparkles, Plus, Edit, Trash2, Settings2, FolderPlus, FilePlus, Copy, CheckCircle2, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Criterion, CriteriaSet, GroupCriterion } from "@/lib/mock-data";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";

const classifications = [
  { name: "Xuất sắc", min: 90, max: 100, color: "from-primary to-primary-glow" },
  { name: "Giỏi", min: 80, max: 89, color: "from-success to-emerald-400" },
  { name: "Khá", min: 65, max: 79, color: "from-accent to-cyan-400" },
  { name: "Trung bình", min: 50, max: 64, color: "from-warning to-orange-400" },
  { name: "Yếu", min: 35, max: 49, color: "from-orange-500 to-red-400" },
  { name: "Kém", min: 0, max: 34, color: "from-destructive to-red-500" },
];

const mutationHeaders = () => {
  let token = localStorage.getItem("drl_token");
  if (!token) {
    try {
      const savedUser = JSON.parse(localStorage.getItem("drl_user") || "null");
      if (savedUser?.username) {
        token = `mock-token-for-${savedUser.username}`;
        localStorage.setItem("drl_token", token);
      }
    } catch {
      // Invalid legacy session data will be handled by the API as unauthenticated.
    }
  }
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export default function Criteria() {
  const { user } = useAuth();
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Criterion | null>(null);

  const [myEvaluation, setMyEvaluation] = useState<any | null>(null);
  const [studentEvals, setStudentEvals] = useState<any[]>([]);
  const [studentPhone, setStudentPhone] = useState("");

  useEffect(() => {
    if (user) {
      setStudentPhone(user.phone || "");
    }
  }, [user]);

  const fetchMyEvaluation = async (criteriaSetId: string) => {
    if (user?.role === "student" && user?.studentId) {
      try {
        const token = localStorage.getItem("drl_token");
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_URL}/evaluations/?studentId=${user.studentId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const semesterOrder: Record<string, number> = { HK1: 1, HK2: 2, HK3: 3 };
          const sorted = (data || []).sort((a: any, b: any) => {
            const yearDifference = (a.year || "").localeCompare(b.year || "");
            if (yearDifference !== 0) return yearDifference;
            return (semesterOrder[a.semester] || 99) - (semesterOrder[b.semester] || 99);
          });
          setStudentEvals(sorted);
          const matched = sorted.find((e: any) => e.criteria_set === parseInt(criteriaSetId));
          setMyEvaluation(matched || null);
        }
      } catch (err) {
        console.error("Lỗi khi tải điểm cá nhân:", err);
      }
    } else {
      setMyEvaluation(null);
    }
  };

  const subItemScores = useMemo(() => {
    const scores: Record<string, number> = {};
    if (myEvaluation && Array.isArray(myEvaluation.details)) {
      myEvaluation.details.forEach((d: any) => {
        scores[d.sub_item_id.toString()] = d.score;
      });
    }
    return scores;
  }, [myEvaluation]);

  const achievedSubItems = useMemo(() => {
    const list: any[] = [];
    criteria.forEach(c => {
      c.groups?.forEach(g => {
        g.subItems?.forEach(s => {
          const score = subItemScores[s.id.toString()];
          if (score > 0) {
            list.push({
              subItem: s,
              score,
              group: g,
              criterion: c
            });
          }
        });
      });
    });
    return list;
  }, [criteria, subItemScores]);

  const canEdit = user?.role === "admin" || user?.role === "student_affairs";
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [isEditingSet, setIsEditingSet] = useState(false);
  const [criteriaSetName, setCriteriaSetName] = useState("");
  const [criteriaSetDescription, setCriteriaSetDescription] = useState("");
  const [setSemester, setSetSemester] = useState("HK1");
  const [setAcademicYear, setSetAcademicYear] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [copyCurrentSet, setCopyCurrentSet] = useState(true);

  const fetchCriteria = async (criteriaSetId = selectedSetId) => {
    if (!criteriaSetId) {
      setCriteria([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/criteria/?criteria_set=${criteriaSetId}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((c: any) => ({
          id: c.id.toString(),
          code: c.code,
          name: c.name,
          maxScore: c.max_score,
          description: c.description || "",
          isManual: c.is_manual || false,
          is_manual: c.is_manual || false,
          groups: c.groups ? c.groups.map((g: any) => ({
            id: g.id.toString(),
            name: g.name,
            isSingleChoice: g.is_single_choice || false,
            is_single_choice: g.is_single_choice || false,
            subItems: g.subItems ? g.subItems.map((s: any) => ({
              id: s.id.toString(),
              name: s.name,
              maxScore: s.max_score
            })) : []
          })) : []
        }));
        setCriteria(mapped);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải cấu trúc tiêu chí");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCriteriaSets = async () => {
      try {
        const res = await fetch(`${API_URL}/criteria-sets/`);
        if (!res.ok) throw new Error("Không thể tải bộ tiêu chí");
        const data = await res.json();
        const mapped: CriteriaSet[] = data.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description || "",
          semester: item.semester || "",
          academicYear: item.academic_year || "",
          effectiveFrom: item.effective_from || "",
          effectiveTo: item.effective_to || "",
          isActive: item.is_active,
          criteriaCount: item.criteria_count,
          totalMaxScore: item.total_max_score
        }));
        setCriteriaSets(mapped);

        if (user?.role === "student" && user?.studentId) {
          const token = localStorage.getItem("drl_token");
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const evalRes = await fetch(`${API_URL}/evaluations/?studentId=${user.studentId}`, { headers });
          if (evalRes.ok) {
            const evData = await evalRes.json();
            const semesterOrder: Record<string, number> = { HK1: 1, HK2: 2, HK3: 3 };
            const sorted = (evData || []).sort((a: any, b: any) => {
              const yearDifference = (a.year || "").localeCompare(b.year || "");
              if (yearDifference !== 0) return yearDifference;
              return (semesterOrder[a.semester] || 99) - (semesterOrder[b.semester] || 99);
            });
            setStudentEvals(sorted);
            if (sorted.length > 0) {
              const latestSetId = String(sorted[sorted.length - 1].criteria_set);
              setSelectedSetId(latestSetId);
              return;
            }
          }
        }

        setSelectedSetId(current => {
          if (current && mapped.some(item => item.id === current)) return current;
          return (mapped.find(item => item.isActive) || mapped[0])?.id || "";
        });
      } catch {
        toast.error("Không thể tải danh sách bộ tiêu chí");
      }
    };
    fetchCriteriaSets();
  }, [user]);

  useEffect(() => {
    fetchCriteria(selectedSetId);
    if (selectedSetId) {
      fetchMyEvaluation(selectedSetId);
    }
  }, [selectedSetId, user]);
  
  // Form states matching 3-level structure
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState(0);
  const [description, setDescription] = useState("");
  const [isManual, setIsManual] = useState(false);
  const [groups, setGroups] = useState<GroupCriterion[]>([]);

  const selectedSet = criteriaSets.find(item => item.id === selectedSetId);

  const refreshCriteriaSets = async (selectId?: string) => {
    const res = await fetch(`${API_URL}/criteria-sets/`);
    if (!res.ok) return;
    const data = await res.json();
    const mapped: CriteriaSet[] = data.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      description: item.description || "",
      semester: item.semester || "",
      academicYear: item.academic_year || "",
      effectiveFrom: item.effective_from || "",
      effectiveTo: item.effective_to || "",
      isActive: item.is_active,
      criteriaCount: item.criteria_count,
      totalMaxScore: item.total_max_score
    }));
    setCriteriaSets(mapped);
    if (selectId) setSelectedSetId(selectId);
  };

  const openCreateSet = () => {
    setCriteriaSetName("");
    setCriteriaSetDescription("");
    setSetSemester(selectedSet?.semester || "HK1");
    setSetAcademicYear(selectedSet?.academicYear || "");
    setEffectiveFrom("");
    setEffectiveTo("");
    setCopyCurrentSet(Boolean(selectedSetId));
    setIsEditingSet(false);
    setSetDialogOpen(true);
  };

  const openEditSet = () => {
    if (!selectedSet) return;
    setCriteriaSetName(selectedSet.name);
    setCriteriaSetDescription(selectedSet.description);
    setSetSemester(selectedSet.semester || "HK1");
    setSetAcademicYear(selectedSet.academicYear || "");
    setEffectiveFrom(selectedSet.effectiveFrom || "");
    setEffectiveTo(selectedSet.effectiveTo || "");
    setIsEditingSet(true);
    setSetDialogOpen(true);
  };

  const saveCriteriaSet = async () => {
    if (!criteriaSetName.trim()) {
      toast.error("Vui lòng nhập tên bộ tiêu chí");
      return;
    }
    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
      toast.error("Ngày bắt đầu phải trước ngày kết thúc");
      return;
    }
    const payload = {
      name: criteriaSetName.trim(),
      description: criteriaSetDescription,
      semester: setSemester,
      academic_year: setAcademicYear,
      effective_from: effectiveFrom || null,
      effective_to: effectiveTo || null,
    };
    try {
      const res = await fetch(`${API_URL}/criteria-sets/${selectedSetId}/`, {
        method: "PATCH",
        headers: mutationHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Không thể cập nhật bộ tiêu chí");
      }
      await refreshCriteriaSets(selectedSetId);
      setSetDialogOpen(false);
      toast.success("Đã cập nhật bộ tiêu chí thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật bộ tiêu chí");
    }
  };

  const createCriteriaSet = async () => {
    if (!criteriaSetName.trim()) {
      toast.error("Vui lòng nhập tên bộ tiêu chí");
      return;
    }
    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
      toast.error("Ngày bắt đầu phải trước ngày kết thúc");
      return;
    }
    const payload = {
      name: criteriaSetName.trim(),
      description: criteriaSetDescription,
      semester: setSemester,
      academic_year: setAcademicYear,
      effective_from: effectiveFrom || null,
      effective_to: effectiveTo || null,
      clone_from: copyCurrentSet ? selectedSetId : null
    };
    try {
      const res = await fetch(`${API_URL}/criteria-sets/`, {
        method: "POST",
        headers: mutationHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        const message = res.status === 403
          ? "Phiên đăng nhập không có quyền quản trị. Vui lòng đăng xuất và đăng nhập lại bằng tài khoản admin."
          : data.detail || "Không thể tạo bộ tiêu chí";
        throw new Error(message);
      }
      await refreshCriteriaSets(data.id.toString());
      setSetDialogOpen(false);
      toast.success(copyCurrentSet ? "Đã tạo bản sao bộ tiêu chí" : "Đã tạo bộ tiêu chí mới");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo bộ tiêu chí");
    }
  };

  const activateCriteriaSet = async () => {
    if (!selectedSetId) return;
    const res = await fetch(`${API_URL}/criteria-sets/${selectedSetId}/activate/`, {
      method: "POST",
      headers: mutationHeaders()
    });
    if (res.ok) {
      await refreshCriteriaSets(selectedSetId);
      toast.success(`Đã áp dụng bộ tiêu chí “${selectedSet?.name}”`);
    } else {
      toast.error("Không thể chuyển bộ tiêu chí đang áp dụng");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setName("");
    setMaxScore(10);
    setDescription("");
    setIsManual(false);
    setGroups([]);
    setOpen(true);
  };

  const openEdit = (c: Criterion) => {
    setEditing(c);
    setCode(c.code);
    setName(c.name);
    setMaxScore(c.maxScore);
    setDescription(c.description);
    setIsManual(Boolean(c.isManual || c.is_manual));
    setGroups(c.groups || []);
    setOpen(true);
  };

  // Group operations
  const addGroup = () => {
    const newGroup: GroupCriterion = {
      id: `g-${Date.now()}`,
      name: `Nhóm tiêu chí mới ${groups.length + 1}`,
      isSingleChoice: false,
      subItems: []
    };
    setGroups([...groups, newGroup]);
    toast.success("Đã thêm nhóm tiêu chí con");
  };

  const toggleGroupSingleChoice = (gId: string, val: boolean) => {
    setGroups(groups.map(g => g.id === gId ? { ...g, isSingleChoice: val } : g));
  };

  const updateGroupName = (gId: string, newName: string) => {
    setGroups(groups.map(g => g.id === gId ? { ...g, name: newName } : g));
  };

  const removeGroup = (gId: string) => {
    setGroups(groups.filter(g => g.id !== gId));
    toast.success("Đã xóa nhóm tiêu chí");
  };

  // SubItem operations
  const addSubItem = (gId: string) => {
    setGroups(groups.map(g => {
      if (g.id === gId) {
        return {
          ...g,
          subItems: [...g.subItems, { id: `s-${Date.now()}`, name: "", maxScore: 0 }]
        };
      }
      return g;
    }));
  };

  const updateSubItemName = (gId: string, sId: string, newName: string) => {
    setGroups(groups.map(g => {
      if (g.id === gId) {
        return {
          ...g,
          subItems: g.subItems.map(s => s.id === sId ? { ...s, name: newName } : s)
        };
      }
      return g;
    }));
  };

  const updateSubItemScore = (gId: string, sId: string, score: any) => {
    setGroups(groups.map(g => {
      if (g.id === gId) {
        return {
          ...g,
          subItems: g.subItems.map(s => s.id === sId ? { ...s, maxScore: score } : s)
        };
      }
      return g;
    }));
  };

  const removeSubItem = (gId: string, sId: string) => {
    setGroups(groups.map(g => {
      if (g.id === gId) {
        return {
          ...g,
          subItems: g.subItems.filter(s => s.id !== sId)
        };
      }
      return g;
    }));
  };

  const save = async () => {
    if (!name) { toast.error("Vui lòng nhập tên tiêu chí lớn"); return; }
    
    // Parse raw string state to number in subitems
    groups.forEach(g => {
      g.subItems.forEach(s => {
        const sScore = typeof s.maxScore === "string" ? (parseInt(s.maxScore) || 0) : s.maxScore;
        s.maxScore = sScore;
      });
    });

    const payload = {
      criteria_set: selectedSetId,
      code,
      name,
      maxScore,
      description,
      isManual,
      groups: groups.map(g => ({
        name: g.name,
        isSingleChoice: g.isSingleChoice || false,
        subItems: g.subItems.map(s => ({
          name: s.name,
          maxScore: s.maxScore
        }))
      }))
    };

    try {
      if (editing) {
        const res = await fetch(`${API_URL}/criteria/${editing.id}/`, {
          method: "PUT",
          headers: mutationHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          toast.success("Đã cập nhật hệ thống tiêu chí 3 cấp thành công!");
          fetchCriteria(selectedSetId);
          refreshCriteriaSets(selectedSetId);
        } else {
          toast.error("Không thể cập nhật tiêu chí");
        }
      } else {
        const res = await fetch(`${API_URL}/criteria/`, {
          method: "POST",
          headers: mutationHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          toast.success("Đã tạo tiêu chí lớn và các nhóm mới!");
          fetchCriteria(selectedSetId);
          refreshCriteriaSets(selectedSetId);
        } else {
          toast.error("Không thể tạo tiêu chí");
        }
      }
      setOpen(false);
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/criteria/${id}/`, {
        method: "DELETE",
        headers: mutationHeaders()
      });
      if (res.ok) {
        toast.success("Đã xóa tiêu chí lớn");
        fetchCriteria(selectedSetId);
        refreshCriteriaSets(selectedSetId);
      } else {
        toast.error("Không thể xóa tiêu chí");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const renderRightPanel = () => {
    const totalScore = myEvaluation?.total_score || 0;
    return (
      <Card className="border-0 shadow-md bg-gradient-card h-fit overflow-hidden">
        <CardHeader className="bg-[#1e74a4] text-white p-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Kết quả ĐG của SV</CardTitle>
          <Badge className="bg-red-500 text-white font-bold border-0 text-xs">
            Tổng cộng: {totalScore} đ
          </Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs rounded-lg p-3 space-y-1">
            <span className="font-bold">Tổng điểm: {totalScore}đ</span>
            <p className="text-[11px] text-muted-foreground mt-1">
              Đánh giá về ý thức và kết quả tham gia các hoạt động chính trị - xã hội, văn hóa, văn nghệ, thể thao, phòng chống tệ nạn xã hội.
            </p>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {achievedSubItems.map((item, idx) => (
              <div key={idx} className="bg-muted/30 border rounded-lg p-2.5 text-xs space-y-1.5 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-[#1e74a4]">Điều {item.criterion.code}</span>
                  <Badge className="bg-[#1e74a4] text-white border-0 text-[10px] py-0 px-1.5 shrink-0">
                    {item.score}đ
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground italic">{item.criterion.name}</p>
                <p className="font-medium text-foreground">{item.subItem.name}</p>
              </div>
            ))}
            {achievedSubItems.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Chưa ghi nhận điểm đạt ở tiêu chí nào.</p>
            )}
          </div>

          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs text-muted-foreground">Số ĐT liên lạc:</Label>
            <Input 
              value={studentPhone} 
              onChange={(e) => setStudentPhone(e.target.value)} 
              placeholder="Nhập số điện thoại liên lạc..." 
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Button 
              className="w-full bg-[#1e74a4] hover:bg-[#1e74a4]/90 text-white text-xs h-9 font-semibold shadow-sm"
              onClick={() => toast.success("Đã xác nhận kết quả đánh giá")}
            >
              Xác nhận kết quả đánh giá
            </Button>
            <Button 
              className="w-full border border-sky-600 bg-transparent text-sky-700 hover:bg-sky-50/50 text-xs h-9 font-semibold"
              onClick={() => toast.info("Đã gửi phản hồi. Phòng Công tác Sinh viên sẽ rà soát lại.")}
            >
              Phản hồi kết quả không chính xác
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-primary" />Cấu trúc Tiêu chí đánh giá
          </h1>
          <p className="text-muted-foreground mt-1">Thiết kế bảng điểm 3 cấp chuẩn theo file Excel của nhà trường.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <Button variant="outline" onClick={openCreateSet} className="gap-2">
                <Layers3 className="h-4 w-4" />Tạo bộ tiêu chí
              </Button>
              <Button onClick={openCreate} disabled={!selectedSetId} className="gap-2 bg-gradient-primary shadow-md">
                <Plus className="h-4 w-4" />Thêm tiêu chí (Cấp 1)
              </Button>
            </>
          )}
        </div>
      </div>

      {user?.role === "student" ? (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="pb-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Chọn học kỳ để xem tiêu chí</Label>
              <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                <SelectTrigger className="max-w-xl">
                  <SelectValue placeholder="Chọn học kỳ" />
                </SelectTrigger>
                <SelectContent>
                  {studentEvals.map((e) => (
                    <SelectItem key={e.id} value={String(e.criteria_set)}>
                      {e.semester} · {e.year}{e.criteria_set === parseInt(criteriaSets.find(item => item.isActive)?.id || "0") ? " (Học kỳ hiện tại)" : ""}
                    </SelectItem>
                  ))}
                  {studentEvals.length === 0 && (
                    <SelectItem value="none" disabled>Chưa có học kỳ nào được tạo phiếu rèn luyện</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {selectedSet ? (
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <Badge variant={selectedSet.isActive ? "success" : "secondary"}>
                  {selectedSet.isActive ? "Đang áp dụng" : "Học kỳ cũ"}
                </Badge>
                {selectedSet.semester && <Badge variant="outline">{selectedSet.semester}</Badge>}
                {selectedSet.academicYear && <Badge variant="outline">Năm học {selectedSet.academicYear}</Badge>}
                <span className="text-muted-foreground">
                  {selectedSet.criteriaCount} mục · tổng tối đa {selectedSet.totalMaxScore} điểm
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Vui lòng chọn học kỳ để xem cấu trúc tiêu chí.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2 flex-1">
                <Label>Bộ tiêu chí đang xem</Label>
                <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                  <SelectTrigger className="max-w-xl">
                    <SelectValue placeholder="Chọn một bộ tiêu chí" />
                  </SelectTrigger>
                  <SelectContent>
                    {criteriaSets.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}{item.isActive ? " — Đang áp dụng" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {selectedSet && canEdit && (
                  <Button variant="outline" onClick={openEditSet} className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50/50">
                    <Edit className="h-4 w-4" />Sửa thông tin
                  </Button>
                )}
                {selectedSet && !selectedSet.isActive && canEdit && (
                  <Button onClick={activateCriteriaSet} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />Dùng bộ này
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedSet ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={selectedSet.isActive ? "default" : "secondary"}>
                  {selectedSet.isActive ? "Đang áp dụng" : "Chưa áp dụng"}
                </Badge>
                {selectedSet.semester && <Badge variant="outline">{selectedSet.semester}</Badge>}
                {selectedSet.academicYear && <Badge variant="outline">Năm học {selectedSet.academicYear}</Badge>}
                {(selectedSet.effectiveFrom || selectedSet.effectiveTo) && (
                  <span className="text-muted-foreground">
                    Hiệu lực: {selectedSet.effectiveFrom || "không giới hạn"} → {selectedSet.effectiveTo || "không giới hạn"}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {selectedSet.criteriaCount} mục · tổng tối đa {selectedSet.totalMaxScore} điểm
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có bộ tiêu chí. Hãy tạo bộ đầu tiên để bắt đầu.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Classification scale */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />Thang xếp loại DRL
          </CardTitle>
          <CardDescription>Cấu hình các mức xếp loại rèn luyện tương ứng tổng điểm</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {classifications.map(c => (
              <div key={c.name} className={`rounded-xl p-4 bg-gradient-to-br ${c.color} text-white shadow-md`}>
                <p className="font-display font-bold text-lg">{c.name}</p>
                <p className="text-sm text-white/80 mt-1">{c.min} - {c.max} điểm</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {user?.role === "student" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Left Column: BẢNG TỔNG HỢP HOẠT ĐỘNG */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-t-xl p-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Bảng tổng hợp hoạt động</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="bg-red-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-between shadow-sm">
                <span>Sinh viên chưa xác nhận bảng đánh giá!</span>
              </div>

              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Đang tải danh sách tiêu chí...
                </div>
              ) : criteria.length > 0 ? (
                !selectedSet?.isActive ? (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <Table className="min-w-[700px] border-collapse text-sm">
                      <TableHeader>
                        <TableRow className="bg-[#1e74a4] text-white hover:bg-[#1e74a4]/90">
                          <TableHead className="w-16 font-bold text-center text-white border border-border">STT</TableHead>
                          <TableHead className="font-bold text-white border border-border">Minh chứng / Nội dung tiêu chí</TableHead>
                          <TableHead className="w-24 font-bold text-center text-white border border-border">Điểm SV</TableHead>
                          <TableHead className="w-24 font-bold text-center text-white border border-border">Điểm tối đa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          let globalStt = 1;
                          return criteria.map(c => {
                            const userScore = myEvaluation?.scores?.[c.id.toString()] ?? 0;
                            return (
                              <>
                                <TableRow key={`c-${c.id}`} className="bg-muted/70 font-bold hover:bg-muted/80 border-b border-border">
                                  <TableCell className="text-center border border-border"></TableCell>
                                  <TableCell className="font-bold text-[#1e74a4] border border-border">
                                    Điều {c.code}: {c.name}
                                  </TableCell>
                                  <TableCell className="text-center text-success font-bold border border-border">{userScore}</TableCell>
                                  <TableCell className="text-center font-bold border border-border">{c.maxScore}</TableCell>
                                </TableRow>

                                {c.groups?.map(g => (
                                  <>
                                    <TableRow key={`g-${g.id}`} className="bg-muted/20 font-semibold hover:bg-muted/30 border-b border-border">
                                      <TableCell className="border border-border" />
                                      <TableCell className="pl-6 font-bold text-foreground/80 border border-border">{g.name}</TableCell>
                                      <TableCell className="border border-border" />
                                      <TableCell className="border border-border" />
                                    </TableRow>

                                    {g.subItems?.map(s => {
                                      const itemScore = subItemScores[s.id.toString()];
                                      const currentStt = globalStt++;
                                      return (
                                        <TableRow key={`s-${s.id}`} className="hover:bg-muted/5 border-b border-border">
                                          <TableCell className="text-center text-muted-foreground border border-border">{currentStt}</TableCell>
                                          <TableCell className="pl-10 text-muted-foreground border border-border">{s.name}</TableCell>
                                          <TableCell className="text-center font-semibold text-blue-600 border border-border">
                                            {itemScore !== undefined ? `${itemScore}` : "-"}
                                          </TableCell>
                                          <TableCell className="text-center text-muted-foreground border border-border"></TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </>
                                ))}
                              </>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Tabs defaultValue={criteria[0]?.id} className="w-full space-y-6">
                    <TabsList className="bg-muted/60 p-1 w-full flex flex-wrap h-auto gap-1 justify-start border border-primary/10 rounded-xl">
                      {criteria.map(c => (
                        <TabsTrigger 
                          key={c.id} 
                          value={c.id} 
                          className="gap-2 px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                          Mục {c.code}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {criteria.map(c => {
                      const userScore = myEvaluation?.scores?.[c.id.toString()] ?? 0;
                      return (
                        <TabsContent key={c.id} value={c.id} className="space-y-4">
                          <Card className="border shadow-md bg-gradient-card">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-display font-bold text-sm shrink-0">
                                    {c.code}
                                  </span>
                                  <CardTitle className="text-lg font-bold">{c.name}</CardTitle>
                                </div>
                                {c.description && <p className="text-sm text-muted-foreground pl-9">{c.description}</p>}
                              </div>
                              <div className="flex flex-wrap gap-2 shrink-0">
                                <Badge variant="secondary" className="text-sm h-7 px-3 bg-primary/10 text-primary border-primary/20">
                                  Điểm đạt: {userScore} / {c.maxScore}đ
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-3 border-t">
                              <div className="space-y-5">
                                {c.groups?.map(g => (
                                  <div key={g.id} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-primary uppercase tracking-wider">{g.name}</p>
                                    </div>
                                    <div className="space-y-2 pl-3 border-l-2 border-muted">
                                      {g.subItems?.map(s => {
                                        const itemScore = subItemScores[s.id.toString()];
                                        return (
                                          <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm hover:bg-muted/65 transition-colors">
                                            <span className="pr-4">{s.name}</span>
                                            <div className="flex items-center gap-2 shrink-0">
                                              {itemScore !== undefined && (
                                                <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                                                  Đã đạt: {itemScore}đ
                                                </Badge>
                                              )}
                                              <Badge variant={s.maxScore < 0 ? "destructive" : "outline"} className={s.maxScore < 0 ? "border-0" : "bg-primary/5 text-primary border-primary/10"}>
                                                {s.maxScore < 0 ? `${s.maxScore} điểm` : `+${s.maxScore} điểm`}
                                              </Badge>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                                {(!c.groups || c.groups.length === 0) && (
                                  <p className="text-sm text-muted-foreground">Chưa cấu hình nhóm tiêu chí con cho mục này.</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )
              ) : (
                <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                  Chưa có tiêu chí rèn luyện nào được cấu hình cho bộ này.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: KẾT QUẢ ĐG CỦA SV */}
          {renderRightPanel()}
        </div>
      ) : (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Danh sách tiêu chí đánh giá (Theo Sheet)</CardTitle>
            <CardDescription>Tiêu chí lớn (Cấp 1) → Nhóm tiêu chí (Cấp 2) → Tiêu chí chi tiết điểm cộng/trừ (Cấp 3)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Đang tải danh sách tiêu chí...
              </div>
            ) : criteria.length > 0 ? (
              !selectedSet?.isActive ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table className="min-w-[700px] border-collapse text-sm">
                    <TableHeader>
                      <TableRow className="bg-[#1e74a4] text-white hover:bg-[#1e74a4]/90">
                        <TableHead className="w-16 font-bold text-center text-white border border-border">STT</TableHead>
                        <TableHead className="font-bold text-white border border-border">Minh chứng / Nội dung tiêu chí</TableHead>
                        <TableHead className="w-24 font-bold text-center text-white border border-border">Điểm tối đa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        let globalStt = 1;
                        return criteria.map(c => {
                          return (
                            <>
                              {/* Level 1: Criterion Row */}
                              <TableRow key={`c-${c.id}`} className="bg-muted/70 font-bold hover:bg-muted/80 border-b border-border">
                                <TableCell className="text-center border border-border"></TableCell>
                                <TableCell className="font-bold text-[#1e74a4] border border-border">
                                  Điều {c.code}: {c.name}
                                </TableCell>
                                <TableCell className="text-center font-bold border border-border">{c.maxScore}</TableCell>
                              </TableRow>

                              {/* Level 2 & 3 Rows */}
                              {c.groups?.map(g => (
                                <>
                                  {/* Level 2: Group Row */}
                                  <TableRow key={`g-${g.id}`} className="bg-muted/20 font-semibold hover:bg-muted/30 border-b border-border">
                                    <TableCell className="border border-border" />
                                    <TableCell className="pl-6 font-bold text-foreground/80 border border-border">{g.name}</TableCell>
                                    <TableCell className="border border-border" />
                                  </TableRow>

                                  {/* Level 3: SubItems Rows */}
                                  {g.subItems?.map(s => {
                                    const currentStt = globalStt++;
                                    return (
                                      <TableRow key={`s-${s.id}`} className="hover:bg-muted/5 border-b border-border">
                                        <TableCell className="text-center text-muted-foreground border border-border">{currentStt}</TableCell>
                                        <TableCell className="pl-10 text-muted-foreground border border-border">{s.name}</TableCell>
                                        <TableCell className="text-center text-muted-foreground border border-border"></TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </>
                              ))}
                            </>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Tabs defaultValue={criteria[0]?.id} className="w-full space-y-6">
                  <TabsList className="bg-muted/60 p-1 w-full flex flex-wrap h-auto gap-1 justify-start border border-primary/10 rounded-xl">
                    {criteria.map(c => (
                      <TabsTrigger 
                        key={c.id} 
                        value={c.id} 
                        className="gap-2 px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                      >
                        Mục {c.code}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {criteria.map(c => {
                    return (
                      <TabsContent key={c.id} value={c.id} className="space-y-4">
                        <Card className="border shadow-md bg-gradient-card">
                          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-display font-bold text-sm shrink-0">
                                  {c.code}
                                </span>
                                <CardTitle className="text-lg font-bold">{c.name}</CardTitle>
                              </div>
                              {c.description && <p className="text-sm text-muted-foreground pl-9">{c.description}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                              <Badge variant="secondary" className="text-sm h-7 px-3 bg-primary/10 text-primary border-primary/20">
                                Tối đa: {c.maxScore}đ
                              </Badge>
                              {(c.isManual || c.is_manual) && (
                                <Badge variant="outline" className="h-7 border-amber-200 bg-amber-50 px-3 text-sm text-amber-700">
                                  Sinh viên tự đánh giá
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6 pt-3 border-t">
                            <div className="space-y-5">
                              {c.groups?.map(g => (
                                <div key={g.id} className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-primary uppercase tracking-wider">{g.name}</p>
                                    {(g.isSingleChoice || g.is_single_choice) && (
                                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-50 text-amber-600 border-amber-200">
                                        Chỉ chọn 1 option
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="space-y-2 pl-3 border-l-2 border-muted">
                                    {g.subItems?.map(s => {
                                      return (
                                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm hover:bg-muted/65 transition-colors">
                                          <span className="pr-4">{s.name}</span>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant={s.maxScore < 0 ? "destructive" : "outline"} className={s.maxScore < 0 ? "border-0" : "bg-primary/5 text-primary border-primary/10"}>
                                              {s.maxScore < 0 ? `${s.maxScore} điểm` : `+${s.maxScore} điểm`}
                                            </Badge>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}

                              {(!c.groups || c.groups.length === 0) && (
                                <p className="text-sm text-muted-foreground">Chưa cấu hình nhóm tiêu chí con cho mục này.</p>
                              )}
                            </div>

                            {canEdit && (
                              <div className="flex gap-2 pt-4 border-t mt-4">
                                <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="gap-1 h-8">
                                  <Edit className="h-3.5 w-3.5" />Sửa cấu trúc
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => remove(c.id)} className="gap-1 h-8 text-destructive hover:text-destructive border-destructive/20">
                                  <Trash2 className="h-3.5 w-3.5" />Xóa mục lớn
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )
            ) : (
              <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                Chưa có tiêu chí rèn luyện nào được cấu hình cho bộ này.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={setDialogOpen} onOpenChange={setSetDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEditingSet ? "Chỉnh sửa thông tin bộ tiêu chí" : "Tạo bộ tiêu chí mới"}
            </DialogTitle>
            <DialogDescription>
              {isEditingSet 
                ? "Cập nhật tên, học kỳ, năm học và thời gian hiệu lực cho bộ tiêu chí này."
                : "Khai báo thời gian sử dụng. Sau khi kiểm tra cấu trúc, quản trị viên có thể chọn “Dùng bộ này”."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tên bộ tiêu chí *</Label>
              <Input value={criteriaSetName} onChange={event => setCriteriaSetName(event.target.value)} placeholder="Ví dụ: Bộ tiêu chí HK2 2026-2027" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Học kỳ</Label>
                <Select value={setSemester} onValueChange={setSetSemester}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HK1">Học kỳ 1</SelectItem>
                    <SelectItem value="HK2">Học kỳ 2</SelectItem>
                    <SelectItem value="HK3">Học kỳ 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Năm học</Label>
                <Input value={setAcademicYear} onChange={event => setSetAcademicYear(event.target.value)} placeholder="2026-2027" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hiệu lực từ</Label>
                <Input type="date" value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hiệu lực đến</Label>
                <Input type="date" value={effectiveTo} onChange={event => setEffectiveTo(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea value={criteriaSetDescription} onChange={event => setCriteriaSetDescription(event.target.value)} rows={2} />
            </div>
            {!isEditingSet && selectedSet && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={copyCurrentSet}
                  onChange={event => setCopyCurrentSet(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Copy className="h-3.5 w-3.5" />Sao chép bộ đang xem</span>
                  <span className="text-xs text-muted-foreground">Tạo sẵn toàn bộ cấu trúc từ “{selectedSet.name}” để chỉnh sửa nhanh.</span>
                </span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetDialogOpen(false)}>Hủy</Button>
            <Button onClick={isEditingSet ? saveCriteriaSet : createCriteriaSet}>
              {isEditingSet ? "Lưu thay đổi" : "Tạo bộ tiêu chí"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit/Create 3-Level Criterion */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Cấu hình Tiêu chí 3 cấp" : "Tạo mới Tiêu chí lớn (Cấp 1)"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Level 1 Fields */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Mã mục (I, II...)</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Ví dụ: I" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Điểm tối đa mục (Cấp 1)</Label>
                <Input type="number" value={maxScore} onChange={e => setMaxScore(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tên tiêu chí lớn (Cấp 1) *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Trách nhiệm học tập..." />
            </div>
            <div className="space-y-2">
              <Label>Mô tả chung</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Mô tả tóm tắt..." />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/20 p-3">
              <input
                type="checkbox"
                checked={isManual}
                onChange={event => setIsManual(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-medium">Sinh viên tự đánh giá tiêu chí này</span>
                <span className="text-xs text-muted-foreground">
                  Các dòng cấp 3 của tiêu chí này sẽ không tự tính từ dữ liệu điểm danh/học lực; sinh viên nhập sau khi CTSV tạo phiên.
                </span>
              </span>
            </label>

            {/* Level 2 & 3 Management */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <FolderPlus className="h-4 w-4 text-primary" /> Nhóm tiêu chí con (Cấp 2)
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addGroup} className="gap-1 h-8">
                  + Thêm nhóm con
                </Button>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {groups.map((g, gIdx) => (
                  <div key={g.id} className="p-4 rounded-xl border bg-muted/30 space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => removeGroup(g.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>

                    <div className="space-y-1.5 w-[85%]">
                      <Label className="text-xs text-primary font-semibold">Tên nhóm tiêu chí con (Cấp 2)</Label>
                      <Input value={g.name} onChange={e => updateGroupName(g.id, e.target.value)} className="h-9 font-semibold" placeholder="1. Tinh thần vượt khó..." />
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          id={`single-choice-${g.id}`}
                          checked={g.isSingleChoice || false}
                          onChange={e => toggleGroupSingleChoice(g.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor={`single-choice-${g.id}`} className="text-xs text-muted-foreground cursor-pointer select-none">
                          Chỉ chọn 1 option (tiêu chí cấp 3)
                        </label>
                      </div>
                    </div>

                    {/* Level 3 items */}
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          <FilePlus className="h-3 w-3" /> Chi tiết tiêu chí (Cấp 3)
                        </span>
                        <Button type="button" size="xs" variant="ghost" className="text-primary hover:text-primary-glow text-xs h-6 px-1.5" onClick={() => addSubItem(g.id)}>
                          + Thêm dòng
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {g.subItems.map((s, sIdx) => (
                          <div key={s.id} className="flex gap-2 items-center">
                            <Input className="flex-1 text-sm h-8" placeholder="a. Có ý thức đi học đầy đủ..." value={s.name} onChange={e => updateSubItemName(g.id, s.id, e.target.value)} />
                            <Input 
                              className="w-[85px] text-sm h-8 font-mono text-center" 
                              type="text" 
                              placeholder="Điểm" 
                              value={s.maxScore} 
                              onChange={e => {
                                const val = e.target.value;
                                if (val === "" || val === "-") {
                                  updateSubItemScore(g.id, s.id, val);
                                } else {
                                  updateSubItemScore(g.id, s.id, parseInt(val) || 0);
                                }
                              }} 
                            />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeSubItem(g.id, s.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {groups.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-xl border border-dashed">
                    Chưa tạo nhóm tiêu chí con. Nhấp nút "+ Thêm nhóm con" để bắt đầu thiết kế.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button onClick={save} className="bg-gradient-primary">
              {editing ? "Lưu thay đổi" : "Tạo tiêu chí"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
