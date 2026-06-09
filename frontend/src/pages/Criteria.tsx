import { useState } from "react";
import { Sparkles, Plus, Edit, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { mockCriteria, Criterion } from "@/lib/mock-data";
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
  const [form, setForm] = useState<Omit<Criterion, "id">>({ code: "", name: "", maxScore: 0, description: "" });

  const totalMax = criteria.reduce((s, c) => s + c.maxScore, 0);

  const openCreate = () => { setEditing(null); setForm({ code: "", name: "", maxScore: 10, description: "" }); setOpen(true); };
  const openEdit = (c: Criterion) => { setEditing(c); setForm({ code: c.code, name: c.name, maxScore: c.maxScore, description: c.description }); setOpen(true); };

  const save = () => {
    if (!form.name) { toast.error("Vui lòng nhập tên tiêu chí"); return; }
    if (editing) {
      setCriteria(criteria.map(c => c.id === editing.id ? { ...c, ...form } : c));
      toast.success("Đã cập nhật tiêu chí");
    } else {
      setCriteria([...criteria, { ...form, id: `c${Date.now()}` }]);
      toast.success("Đã thêm tiêu chí mới");
    }
    setOpen(false);
  };

  const remove = (id: string) => { setCriteria(criteria.filter(c => c.id !== id)); toast.success("Đã xóa tiêu chí"); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3"><Sparkles className="h-7 w-7 text-primary" />Tiêu chí đánh giá</h1>
          <p className="text-muted-foreground mt-1">Quản lý {criteria.length} tiêu chí • Tổng tối đa: {totalMax} điểm</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-gradient-primary shadow-md"><Plus className="h-4 w-4" />Thêm tiêu chí</Button>
      </div>

      {/* Classification scale */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />Thang xếp loại</CardTitle>
          <CardDescription>Cấu hình các mức xếp loại theo tổng điểm</CardDescription>
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

      {/* Criteria list */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-display">Danh sách tiêu chí</CardTitle>
          <CardDescription>Mỗi tiêu chí có thể có các tiêu chí con với thang điểm riêng</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {criteria.map(c => (
              <AccordionItem key={c.id} value={c.id} className="border rounded-xl px-4 bg-gradient-card">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-display font-bold shrink-0">{c.code}</div>
                    <div className="flex-1">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-normal">{c.description}</p>
                    </div>
                    <Badge variant="secondary" className="mr-2">Tối đa {c.maxScore}đ</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-13 pt-2">
                    {c.subCriteria?.map(sc => (
                      <div key={sc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
                        <span>• {sc.name}</span>
                        <Badge variant="outline">{sc.maxScore} điểm</Badge>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="gap-1"><Edit className="h-3.5 w-3.5" />Sửa</Button>
                      <Button variant="outline" size="sm" onClick={() => remove(c.id)} className="gap-1 text-destructive hover:text-destructive border-destructive/30"><Trash2 className="h-3.5 w-3.5" />Xóa</Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editing ? "Cập nhật tiêu chí" : "Thêm tiêu chí mới"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Mã (I, II...)</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
              <div className="space-y-2 col-span-2"><Label>Điểm tối đa</Label><Input type="number" value={form.maxScore} onChange={e => setForm({ ...form, maxScore: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="space-y-2"><Label>Tên tiêu chí *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Mô tả</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button onClick={save} className="bg-gradient-primary">{editing ? "Cập nhật" : "Thêm mới"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
