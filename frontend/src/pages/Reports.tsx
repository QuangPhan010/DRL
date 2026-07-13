import { useState, useEffect } from "react";
import { 
  FileText, ClipboardList, History, Calendar, Play, Loader2, 
  CheckCircle, XCircle, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Settings2,
  Search, Check, ChevronDown, Square, CheckSquare
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { API_URL } from "@/contexts/AuthContext";

interface ReportDefinition {
  id: number;
  code: string;
  name: string;
  description: string;
  module: string;
  category: string;
  permission_required: string;
}

interface ReportJob {
  id: number;
  report_code: string;
  report_name: string;
  created_by_name: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  parameters: Record<string, any>;
  created_at: string;
  file_path?: string;
  file_name?: string;
}

export default function Reports() {
  const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  const getCurrentSemester = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    if (month >= 8 && month <= 12) {
      return "HK1";
    } else if (month >= 1 && month <= 3) {
      return "HK2";
    } else {
      return "HK3";
    }
  };

  const getAcademicYearsList = () => {
    const currentYearStr = getCurrentAcademicYear();
    const activeYearStr = activeYear;
    
    const years = new Set<string>();
    years.add("2023-2024");
    years.add("2024-2025");
    years.add("2025-2026");
    years.add(currentYearStr);
    if (activeYearStr) years.add(activeYearStr);
    
    return Array.from(years).sort((a, b) => {
      const startA = parseInt(a.split("-")[0]);
      const startB = parseInt(b.split("-")[0]);
      return startA - startB;
    });
  };

  const getSemestersForYear = (selectedYear: string) => {
    const allSemesters = ["HK1", "HK2", "HK3"];
    
    const currentYearStr = getCurrentAcademicYear();
    const currentSemStr = getCurrentSemester();
    
    let thresholdYear = currentYearStr;
    let thresholdSem = currentSemStr;
    
    if (activeYear) {
      const activeStart = parseInt(activeYear.split("-")[0]);
      const currentStart = parseInt(currentYearStr.split("-")[0]);
      if (activeStart > currentStart) {
        thresholdYear = activeYear;
        thresholdSem = activeSemester;
      } else if (activeStart === currentStart) {
        const semOrder = { "HK1": 1, "HK2": 2, "HK3": 3 };
        if (semOrder[activeSemester as keyof typeof semOrder] > semOrder[currentSemStr as keyof typeof semOrder]) {
          thresholdSem = activeSemester;
        }
      }
    }
    
    const selectedStart = parseInt(selectedYear.split("-")[0]);
    const thresholdStart = parseInt(thresholdYear.split("-")[0]);
    
    if (selectedStart < thresholdStart) {
      return allSemesters;
    } else if (selectedStart === thresholdStart) {
      const semOrder = { "HK1": 1, "HK2": 2, "HK3": 3 };
      const maxSemOrder = semOrder[thresholdSem as keyof typeof semOrder] || 3;
      return allSemesters.filter(sem => semOrder[sem as keyof typeof semOrder] <= maxSemOrder);
    } else {
      return ["HK1"];
    }
  };

  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [activeSemester, setActiveSemester] = useState(getCurrentSemester());
  const [activeYear, setActiveYear] = useState(getCurrentAcademicYear());

  // Job creation modal
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({
    school_year: getCurrentAcademicYear(),
    semester: getCurrentSemester(),
  });
  const [creatingJob, setCreatingJob] = useState(false);

  // States for Class and Faculty parameters
  interface ClassInfo {
    id: number;
    name: string;
    faculty: string;
    cohort: string;
  }
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [facultySearch, setFacultySearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [isOpenFacultyDropdown, setIsOpenFacultyDropdown] = useState(false);
  const [isOpenClassDropdown, setIsOpenClassDropdown] = useState(false);

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/classes/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setClasses(data || []);
        const uniqueFaculties = Array.from(new Set(data.map((c: any) => c.faculty))).filter(Boolean) as string[];
        setFaculties(uniqueFaculties);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách lớp:", err);
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    const fetchActivePeriod = async () => {
      try {
        const token = localStorage.getItem("drl_token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/criteria-sets/`, { headers });
        if (res.ok) {
          const data = await res.json();
          const active = data.find((item: any) => item.is_active);
          if (active) {
            setActiveSemester(active.semester);
            setActiveYear(active.academic_year);
            setParameters(prev => ({
              ...prev,
              school_year: active.academic_year,
              semester: active.semester
            }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchActivePeriod();
    fetchDefinitions();
    fetchClasses();
    fetchJobs(1);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".relative")) {
        setIsOpenFacultyDropdown(false);
        setIsOpenClassDropdown(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const hasActiveJobs = jobs.some(job => job.status === "PENDING" || job.status === "RUNNING");
    if (hasActiveJobs) {
      const timer = setTimeout(() => {
        fetchJobs(currentPage);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [jobs, currentPage]);

  const fetchDefinitions = async () => {
    try {
      setLoadingDefs(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/reports/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDefinitions(data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh mục báo cáo:", err);
      toast.error("Không thể tải danh mục báo cáo.");
    } finally {
      setLoadingDefs(false);
    }
  };

  const fetchJobs = async (page: number) => {
    try {
      setLoadingJobs(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/reports/jobs/?page=${page}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.results || []);
        // Determine total pages from count
        const count = data.count || 0;
        setTotalPages(Math.ceil(count / 10) || 1);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error("Lỗi lấy lịch sử kết xuất:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleCreateJob = async () => {
    if (!selectedReport) return;
    try {
      setCreatingJob(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/reports/jobs/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          report_code: selectedReport.code,
          parameters,
        }),
      });

      if (res.ok) {
        toast.success(`Đã khởi tạo yêu cầu xuất báo cáo thành công!`);
        setSelectedReport(null);
        fetchJobs(1);
      } else {
        const errData = await res.json();
        toast.error(errData.message || "Tạo yêu cầu thất bại.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Đã xảy ra lỗi khi tạo yêu cầu.");
    } finally {
      setCreatingJob(false);
    }
  };

  // Group definitions by category
  const categories = Array.from(new Set(definitions.map(d => d.category)));

  const getStatusBadge = (status: ReportJob["status"]) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Chờ xử lý</Badge>;
      case "RUNNING":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Đang chạy</Badge>;
      case "SUCCESS":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle className="h-3 w-3 mr-1" /> Thành công</Badge>;
      case "FAILED":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20"><XCircle className="h-3 w-3 mr-1" /> Thất bại</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" /> Trung tâm Báo cáo
        </h1>
        <p className="text-muted-foreground mt-1">Xây dựng và xuất các báo cáo tổng hợp, thống kê dữ liệu rèn luyện của sinh viên.</p>
      </div>

      {/* Grid of Report Categories */}
      {loadingDefs ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(cat => (
            <Card key={cat} className="border border-border/50 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
              <CardHeader className="bg-muted/30 border-b border-border/20 py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" /> {cat}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {definitions.filter(d => d.category === cat).map(rep => (
                  <div key={rep.id} className="p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/10 transition-colors flex items-start justify-between gap-3 group">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors">{rep.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{rep.description}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="shrink-0 h-8 gap-1.5 hover:bg-primary hover:text-white"
                      onClick={() => {
                        setSelectedReport(rep);
                        setParameters({
                          school_year: activeYear,
                          semester: activeSemester,
                          format: "excel",
                          faculty: "",
                          class_name: ""
                        });
                      }}
                    >
                      <Play className="h-3 w-3 fill-current" /> Xuất
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full text-center py-12 border border-dashed rounded-2xl">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Không có danh mục báo cáo nào khả dụng cho vai trò của bạn.</p>
            </div>
          )}
        </div>
      )}

      {/* History of Report Jobs */}
      <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Yêu cầu kết xuất gần đây
            </CardTitle>
            <CardDescription>Danh sách lịch sử các file báo cáo đã yêu cầu thực hiện</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => fetchJobs(currentPage)} disabled={loadingJobs}>
            <RefreshCw className={`h-4 w-4 ${loadingJobs ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
                <tr>
                  <th className="px-6 py-4">Tên báo cáo</th>
                  <th className="px-6 py-4">Tham số yêu cầu</th>
                  <th className="px-6 py-4">Người tạo</th>
                  <th className="px-6 py-4">Thời gian khởi tạo</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground/90">{job.report_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(job.parameters).map(([key, val]) => (
                          <Badge key={key} variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                            {key}: {String(val)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{job.created_by_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(job.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(job.status)}</td>
                    <td className="px-6 py-4">
                      {job.status === "SUCCESS" && job.file_path ? (
                        <a 
                          href={`${API_URL.replace('/api', '')}${job.file_path}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-primary hover:underline font-semibold flex items-center gap-1"
                          download
                        >
                          Tải xuống
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && !loadingJobs && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Chưa có yêu cầu báo cáo nào được thực hiện.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border/20 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Trang {currentPage} / {totalPages}</p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={currentPage === 1 || loadingJobs} 
                  onClick={() => fetchJobs(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Trước
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={currentPage === totalPages || loadingJobs} 
                  onClick={() => fetchJobs(currentPage + 1)}
                >
                  Sau <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parameters Setup Dialog */}
      <Dialog open={selectedReport !== null} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" /> Thiết lập tham số báo cáo
            </DialogTitle>
            <DialogDescription>
              Vui lòng cung cấp đầy đủ các tham số lọc cho báo cáo <strong>{selectedReport?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school_year">Năm học</Label>
                <select 
                  id="school_year" 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={parameters.school_year || ""} 
                  onChange={(e) => {
                    const nextYear = e.target.value;
                    const availableSems = getSemestersForYear(nextYear);
                    let nextSem = parameters.semester;
                    if (!availableSems.includes(nextSem)) {
                      nextSem = availableSems[0] || "HK1";
                    }
                    setParameters(prev => ({ 
                      ...prev, 
                      school_year: nextYear,
                      semester: nextSem
                    }));
                  }}
                >
                  {getAcademicYearsList().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Học kỳ</Label>
                <select 
                  id="semester" 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={parameters.semester || ""} 
                  onChange={(e) => setParameters(prev => ({ ...prev, semester: e.target.value }))}
                >
                  {getSemestersForYear(parameters.school_year || "").map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="format">Định dạng file</Label>
              <select 
                id="format"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={parameters.format || "excel"}
                onChange={(e) => setParameters(prev => ({ ...prev, format: e.target.value }))}
              >
                <option value="excel">Excel (.xlsx)</option>
                <option value="pdf">PDF (.pdf)</option>
              </select>
            </div>

            {(selectedReport?.code === "student_list" || selectedReport?.code === "evaluation_detail" || selectedReport?.code === "evaluation_summary") && (
              <>
                <div className="space-y-2 relative">
                  <Label htmlFor="faculty">Khoa</Label>
                  <div 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpenFacultyDropdown(!isOpenFacultyDropdown);
                      setIsOpenClassDropdown(false);
                    }}
                  >
                    <span className="truncate">
                      {parameters.faculty || "Chọn Khoa..."}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </div>
                  
                  {isOpenFacultyDropdown && (
                    <div className="absolute z-50 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 slide-in-from-top-1 mt-1 max-h-60 overflow-y-auto">
                      <div className="flex items-center border-b px-2 pb-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input 
                          className="flex h-8 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Tìm kiếm khoa..."
                          value={facultySearch}
                          onChange={(e) => setFacultySearch(e.target.value)}
                        />
                      </div>
                      <div className="pt-1.5">
                        {faculties
                          .filter(f => f.toLowerCase().includes(facultySearch.toLowerCase()))
                          .map(fac => (
                            <div 
                              key={fac}
                              className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setParameters(prev => ({ ...prev, faculty: fac, class_name: "" }));
                                setIsOpenFacultyDropdown(false);
                                setFacultySearch("");
                              }}
                            >
                              {parameters.faculty === fac && (
                                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                  <Check className="h-4 w-4" />
                                </span>
                              )}
                              {fac}
                            </div>
                          ))}
                        {faculties.filter(f => f.toLowerCase().includes(facultySearch.toLowerCase())).length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">Không tìm thấy khoa nào.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="class_name">Tên lớp học</Label>
                  <div 
                    className={`flex min-h-[2.5rem] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${!parameters.faculty ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!parameters.faculty) return;
                      setIsOpenClassDropdown(!isOpenClassDropdown);
                      setIsOpenFacultyDropdown(false);
                    }}
                  >
                    <div className="flex flex-wrap gap-1 max-w-[90%] font-normal">
                      {parameters.class_name ? (
                        parameters.class_name.split(',').map(s => s.trim()).filter(Boolean).map(cls => (
                          <Badge key={cls} variant="secondary" className="text-xs">
                            {cls}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          {parameters.faculty ? "Chọn lớp học..." : "Vui lòng chọn Khoa trước"}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </div>

                  {isOpenClassDropdown && parameters.faculty && (
                    <div className="absolute z-50 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 slide-in-from-top-1 mt-1 max-h-60 overflow-y-auto">
                      <div className="flex items-center border-b px-2 pb-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input 
                          className="flex h-8 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Tìm kiếm lớp..."
                          value={classSearch}
                          onChange={(e) => setClassSearch(e.target.value)}
                        />
                      </div>
                      <div className="pt-1.5">
                        {/* Option: Chọn tất cả */}
                        {(() => {
                          const facultyClasses = classes.filter(c => c.faculty === parameters.faculty);
                          const selectedClassesList = parameters.class_name 
                            ? parameters.class_name.split(',').map(s => s.trim()).filter(Boolean)
                            : [];
                          const isAllSelected = facultyClasses.length > 0 && facultyClasses.every(c => selectedClassesList.includes(c.name));
                          
                          const toggleSelectAll = () => {
                            if (isAllSelected) {
                              const otherClasses = selectedClassesList.filter(name => !facultyClasses.some(c => c.name === name));
                              setParameters(prev => ({ ...prev, class_name: otherClasses.join(',') }));
                            } else {
                              const currentFacultyClassNames = facultyClasses.map(c => c.name);
                              const otherClasses = selectedClassesList.filter(name => !currentFacultyClassNames.includes(name));
                              const merged = [...otherClasses, ...currentFacultyClassNames];
                              setParameters(prev => ({ ...prev, class_name: merged.join(',') }));
                            }
                          };

                          const toggleClass = (clsName: string) => {
                            let newList: string[];
                            if (selectedClassesList.includes(clsName)) {
                              newList = selectedClassesList.filter(n => n !== clsName);
                            } else {
                              newList = [...selectedClassesList, clsName];
                            }
                            setParameters(prev => ({ ...prev, class_name: newList.join(',') }));
                          };

                          return (
                            <>
                              <div 
                                className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm font-semibold outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectAll();
                                }}
                              >
                                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                  {isAllSelected ? (
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Square className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </span>
                                Chọn tất cả lớp
                              </div>
                              <div className="border-t my-1"></div>
                              {facultyClasses
                                .filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase()))
                                .map(cls => {
                                  const isSelected = selectedClassesList.includes(cls.name);
                                  return (
                                    <div 
                                      key={cls.id}
                                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleClass(cls.name);
                                      }}
                                    >
                                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                        {isSelected ? (
                                          <CheckSquare className="h-4 w-4 text-primary" />
                                        ) : (
                                          <Square className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </span>
                                      {cls.name}
                                    </div>
                                  );
                                })}
                              {facultyClasses.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())).length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">Không tìm thấy lớp nào.</div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>Hủy bỏ</Button>
            <Button onClick={handleCreateJob} disabled={creatingJob}>
              {creatingJob ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />} Khởi tạo Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
