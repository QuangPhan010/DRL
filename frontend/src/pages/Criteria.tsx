import { useState } from "react";
import { Sparkles, Plus, Edit, Trash2, Settings2, FolderPlus, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { mockCriteria, Criterion, GroupCriterion, SubItem } from "@/lib/mock-data";
import { toast } from "sonner";

const classifications = [
  { name: "Xuất sắc", min: 90, max: 100, color: "from-primary to-primary-glow" },
  { name: "Tốt", min: 80, max: 89, color: "from-success to-emerald-400" },
  { name: "Khá", min: 65, max: 79, color: "from-accent to-cyan-400" },
  { name: "Trung bình", min: 50, max: 64, color: "from-warning to-orange-400" },
  { name: "Yếu", min: 35, max: 49, color: "from-orange-500 to-red-400" },
  { name: "Kém", min: 0, max: 34, color: "from-destructive to-red-500" },
];

export default function Criteria() {
  const [criteria, setCriteria] = useState<Criterion[]>(mockCriteria);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Criterion | null>(null);
  
  // Form states matching 3-level structure
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState(0);
  const [description, setDescription] = useState("");
  const [groups, setGroups] = useState<GroupCriterion[]>([]);

  const totalMax = criteria.reduce((s, c) => s + c.maxScore, 0);

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setName("");
    setMaxScore(10);
    setDescription("");
    setGroups([]);
    setOpen(true);
  };

  const openEdit = (c: Criterion) => {
    setEditing(c);
    setCode(c.code);
    setName(c.name);
    setMaxScore(c.maxScore);
    setDescription(c.description);
    setGroups(c.groups || []);
    setOpen(true);
  };

  // Group operations
  const addGroup = () => {
    const newGroup: GroupCriterion = {
      id: `g-${Date.now()}`,
      name: `Nhóm tiêu chí mới ${groups.length + 1}`,
      subItems: []
    };
    setGroups([...groups, newGroup]);
    toast.success("Đã thêm nhóm tiêu chí con");
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

  const updateSubItemScore = (gId: string, sId: string, score: number) => {
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

  const save = () => {
    if (!name) { toast.error("Vui lòng nhập tên tiêu chí lớn"); return; }
    
    // Auto-calculate parent maxScore based on positive scores in subitems
    let calculatedMaxScore = maxScore;
    let hasSubItems = false;
    let sum = 0;
    
    groups.forEach(g => {
      g.subItems.forEach(s => {
        hasSubItems = true;
        if (s.maxScore > 0) {
          sum += s.maxScore;
        }
      });
    });

    if (hasSubItems) {
      calculatedMaxScore = sum;
    }

    const savedData: Omit<Criterion, "id"> & { id?: string } = {
      code,
      name,
      maxScore: calculatedMaxScore,
      description,
      groups
    };

    if (editing) {
      setCriteria(criteria.map(c => c.id === editing.id ? { ...c, ...savedData } as Criterion : c));
      toast.success("Đã cập nhật hệ thống tiêu chí 3 cấp thành công!");
    } else {
      setCriteria([...criteria, { ...savedData, id: `c${Date.now()}` } as Criterion]);
      toast.success("Đã tạo tiêu chí lớn và các nhóm mới!");
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id));
    toast.success("Đã xóa tiêu chí lớn");
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
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary shadow-md">
          <Plus className="h-4 w-4" />Thêm tiêu chí (Cấp 1)
        </Button>
      </div>

      {/* Classification scale */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />Thang xếp loại DRL
          </CardTitle>
          <CardDescription>Cấu hình các mức xếp loại rèn luyện tương ứng tổng điểm</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {classifications.map(c => (
              <div key={c.name} className={`rounded-xl p-4 bg-gradient-to-br ${c.color} text-white shadow-md`}>
                <p className="font-display font-bold text-lg">{c.name}</p>
                <p className="text-sm text-white/80 mt-1">{c.min} - {c.max} điểm</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Criteria list 3-level */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-display">Danh sách tiêu chí đánh giá (3 Cấp)</CardTitle>
          <CardDescription>Tiêu chí lớn (Cấp 1) → Nhóm tiêu chí (Cấp 2) → Tiêu chí chi tiết điểm cộng/trừ (Cấp 3)</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-3">
            {criteria.map(c => (
              <AccordionItem key={c.id} value={c.id} className="border rounded-xl px-4 bg-gradient-card">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-display font-bold shrink-0">
                      {c.code}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-base">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-normal mt-0.5">{c.description}</p>
                    </div>
                    <Badge variant="secondary" className="mr-2 text-xs h-6 px-2.5">Tối đa {c.maxScore}đ</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4 pl-12 pt-2 border-l border-primary/10 ml-5">
                    {c.groups?.map(g => (
                      <div key={g.id} className="space-y-2">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider">{g.name}</p>
                        <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                          {g.subItems.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
                              <span>{s.name}</span>
                              <Badge variant={s.maxScore < 0 ? "destructive" : "outline"} className={s.maxScore < 0 ? "border-0" : "bg-primary/5 text-primary border-primary/10"}>
                                {s.maxScore < 0 ? `${s.maxScore} điểm` : `+${s.maxScore} điểm`}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {(!c.groups || c.groups.length === 0) && (
                      <p className="text-sm text-muted-foreground">Chưa cấu hình nhóm tiêu chí con cho mục này.</p>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="gap-1 h-8">
                        <Edit className="h-3.5 w-3.5" />Sửa cấu trúc
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => remove(c.id)} className="gap-1 h-8 text-destructive hover:text-destructive border-destructive/20">
                        <Trash2 className="h-3.5 w-3.5" />Xóa mục lớn
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

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
                <Label>Điểm tối đa mục (Tự tính nếu có mục con)</Label>
                <Input type="number" disabled={groups.some(g => g.subItems.length > 0)} value={groups.some(g => g.subItems.length > 0) ? groups.reduce((acc, g) => acc + g.subItems.reduce((sacc, s) => s.maxScore > 0 ? sacc + s.maxScore : sacc, 0), 0) : maxScore} onChange={e => setMaxScore(parseInt(e.target.value) || 0)} />
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
                            <Input className="w-[85px] text-sm h-8 font-mono text-center" type="number" placeholder="Điểm" value={s.maxScore} onChange={e => updateSubItemScore(g.id, s.id, parseInt(e.target.value) || 0)} />
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
