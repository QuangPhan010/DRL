import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, CalendarDays, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RadialTimePicker } from "./Activities";
import { OrganizerPicker } from "@/components/OrganizerPicker";
import Loading from "./Loading";

const getLocalToday = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

export default function ActivityForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [criteria, setCriteria] = useState<any[]>([]);

  // Time picker states
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | 'regStart' | 'regEnd'>('start');

  // Form states
  const [scope, setScope] = useState<"internal" | "external">("internal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("5");
  const [criterionId, setCriterionId] = useState("");
  const [date, setDate] = useState(getLocalToday);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("11:00");
  const [maxParticipants, setMaxParticipants] = useState("100");
  const [registeredCount, setRegisteredCount] = useState(0);

  // New scope and registration fields
  const [scopeType, setScopeType] = useState<"all" | "class" | "club">("all");
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<number[]>([]);
  const [isRegistrationRequired, setIsRegistrationRequired] = useState(false);
  const [registrationStartDate, setRegistrationStartDate] = useState(getLocalToday);
  const [registrationStartTime, setRegistrationStartTime] = useState("08:00");
  const [registrationEndDate, setRegistrationEndDate] = useState(getLocalToday);
  const [registrationEndTime, setRegistrationEndTime] = useState("11:00");

  const [classList, setClassList] = useState<any[]>([]);
  const [clubList, setClubList] = useState<any[]>([]);
  const [classSearch, setClassSearch] = useState("");
  const [clubSearch, setClubSearch] = useState("");

  // Off-campus fields
  const [organizerName, setOrganizerName] = useState("");
  const [location, setLocation] = useState("");
  const [endDate, setEndDate] = useState(getLocalToday);
  const [activityType, setActivityType] = useState("Hoạt động xã hội");

  // Fetch initial data (criteria, classes, clubs, and activity if editing)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch criteria
        const critRes = await fetch(`${API_URL}/criteria/`);
        if (critRes.ok) {
          const critData = await critRes.json();
          const mapped = critData.map((c: any) => ({
            id: `c${c.id}`,
            code: c.code,
            name: c.name,
            maxScore: Number(c.max_score),
            description: c.description
          }));
          setCriteria(mapped);
          if (mapped.length > 0 && !criterionId) {
            setCriterionId(mapped[0].id);
          }
        }

        // Fetch classes
        const classRes = await fetch(`${API_URL}/classes/`);
        if (classRes.ok) {
          const classData = await classRes.json();
          setClassList(classData);
        }

        // Fetch clubs
        const orgRes = await fetch(`${API_URL}/organizations/`);
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setClubList(orgData.filter((org: any) => org.type === "CLB"));
        }

        // If editing, fetch activity details
        if (isEditing) {
          setLoading(true);
          const actRes = await fetch(`${API_URL}/activities/${id}/`);
          if (actRes.ok) {
            const act = await actRes.json();
            setTitle(act.title);
            setDescription(act.description || "");
            setOrganizerName(act.organizer || "");
            setPoints(act.points.toString());
            setCriterionId(act.criterion ? `c${act.criterion}` : "c3");
            setDate(act.date);
            setStartTime(act.start_time ? act.start_time.substring(0, 5) : "08:00");
            setEndTime(act.end_time ? act.end_time.substring(0, 5) : "11:00");
            setMaxParticipants(String(act.max_participants || 100));
            setRegisteredCount(act.participants?.length || 0);
            setScopeType(act.scope_type || "all");
            setSelectedClasses(act.allowed_classes || []);
            setSelectedClubs(act.allowed_clubs || []);
            setIsRegistrationRequired(!!act.is_registration_required);

            const toLocalDateAndTime = (isoString?: string) => {
              if (!isoString) return { date: getLocalToday(), time: "08:00" };
              const d = new Date(isoString);
              const offset = d.getTimezoneOffset();
              const localDate = new Date(d.getTime() - offset * 60 * 1000);
              const isoStr = localDate.toISOString();
              return {
                date: isoStr.slice(0, 10),
                time: isoStr.slice(11, 16)
              };
            };

            const regStartVal = toLocalDateAndTime(act.registration_start);
            setRegistrationStartDate(regStartVal.date);
            setRegistrationStartTime(regStartVal.time);

            const regEndVal = toLocalDateAndTime(act.registration_end);
            setRegistrationEndDate(regEndVal.date);
            setRegistrationEndTime(regEndVal.time);
          } else {
            toast.error("Không thể tải chi tiết hoạt động cần chỉnh sửa.");
            navigate("/activities");
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi khi tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizerName.trim()) {
      toast.error("Vui lòng chọn hoặc thêm đơn vị tổ chức.");
      return;
    }
    try {
      const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return 180;
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        let diffMins = (eh * 60 + em) - (sh * 60 + sm);
        if (diffMins < 0) diffMins += 24 * 60;
        return diffMins;
      };

      let res;
      if (scope === "internal") {
        const url = isEditing
          ? `${API_URL}/activities/${id}/`
          : `${API_URL}/activities/`;
        const method = isEditing ? "PUT" : "POST";
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            points: Number(points),
            criterion: Number(criterionId.replace(/\D/g, "")) || 3,
            date,
            organizer: organizerName.trim(),
            status: "upcoming",
            latitude: 10.850100,
            longitude: 106.771200,
            radius_meters: 100,
            duration_minutes: calculateDuration(startTime, endTime),
            max_participants: Number(maxParticipants),
            start_time: startTime ? `${startTime}:00` : null,
            end_time: endTime ? `${endTime}:00` : null,
            scope_type: scopeType,
            allowed_classes: scopeType === "class" ? selectedClasses : [],
            allowed_clubs: scopeType === "club" ? selectedClubs : [],
            is_registration_required: isRegistrationRequired,
            registration_start: isRegistrationRequired && registrationStartDate && registrationStartTime ? new Date(`${registrationStartDate}T${registrationStartTime}:00`).toISOString() : null,
            registration_end: isRegistrationRequired && registrationEndDate && registrationEndTime ? new Date(`${registrationEndDate}T${registrationEndTime}:00`).toISOString() : null
          })
        });
      } else {
        const url = isEditing
          ? `${API_URL}/external-activities/${id}/`
          : `${API_URL}/external-activities/`;
        const method = isEditing ? "PUT" : "POST";
        const token = localStorage.getItem("drl_token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify({
            activity_name: title,
            organizer_name: organizerName,
            start_date: date,
            end_date: endDate,
            location,
            activity_type: activityType,
            proposed_score: Number(points),
            description,
            status: "draft"
          })
        });
      }

      if (res.ok) {
        toast.success(isEditing ? "Đã cập nhật hoạt động thành công!" : "Đã tạo hoạt động thành công!");
        window.dispatchEvent(new Event("refresh-external-activities"));
        navigate("/activities");
      } else {
        const errData = await res.json();
        console.error("Lỗi từ backend:", errData);
        const capacityError = Array.isArray(errData?.max_participants)
          ? errData.max_participants[0]
          : errData?.max_participants;
        toast.error(capacityError || errData?.error || "Không thể lưu hoạt động.");
      }
    } catch (err) {
      console.error("Lỗi kết nối:", err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const filteredClassList = classList.filter(cls =>
    cls.name.toLowerCase().includes(classSearch.toLowerCase()) ||
    (cls.faculty && cls.faculty.toLowerCase().includes(classSearch.toLowerCase()))
  );

  const filteredClubList = clubList.filter(club =>
    club.name.toLowerCase().includes(clubSearch.toLowerCase())
  );

  const handleSelectAllClasses = () => {
    const filteredIds = filteredClassList.map(cls => cls.id);
    const newSelection = Array.from(new Set([...selectedClasses, ...filteredIds]));
    setSelectedClasses(newSelection);
  };

  const handleDeselectAllClasses = () => {
    const filteredIds = filteredClassList.map(cls => cls.id);
    const newSelection = selectedClasses.filter(id => !filteredIds.includes(id));
    setSelectedClasses(newSelection);
  };

  const handleSelectAllClubs = () => {
    const filteredIds = filteredClubList.map(club => club.id);
    const newSelection = Array.from(new Set([...selectedClubs, ...filteredIds]));
    setSelectedClubs(newSelection);
  };

  const handleDeselectAllClubs = () => {
    const filteredIds = filteredClubList.map(club => club.id);
    const newSelection = selectedClubs.filter(id => !filteredIds.includes(id));
    setSelectedClubs(newSelection);
  };

  if (loading) {
    return <Loading message="Đang tải dữ liệu hoạt động..." />;
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Back Button */}
      <Button variant="ghost" className="gap-2" onClick={() => navigate("/activities")}>
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </Button>

      <div className="max-w-xl mx-auto">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-muted/20 border-b">
            <CardTitle className="font-display text-xl font-bold">
              {isEditing ? "Chỉnh sửa hoạt động rèn luyện" : "Tạo hoạt động rèn luyện mới"}
            </CardTitle>
            <CardDescription>
              Điền đầy đủ thông tin để tạo hoặc cập nhật hoạt động rèn luyện sinh viên.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Scope selection */}
              <div className="space-y-2">
                <Label>Phạm vi hoạt động</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={scope === "internal" ? "default" : "outline"}
                    onClick={() => !isEditing && setScope("internal")}
                    className={scope === "internal" ? "bg-gradient-primary text-white font-medium shadow-sm" : ""}
                    disabled={isEditing}
                  >
                    Trong trường
                  </Button>
                  <Button
                    type="button"
                    variant={scope === "external" ? "default" : "outline"}
                    onClick={() => !isEditing && setScope("external")}
                    className={scope === "external" ? "bg-gradient-primary text-white font-medium shadow-sm" : ""}
                    disabled={isEditing}
                  >
                    Ngoài trường
                  </Button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Tên hoạt động</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ví dụ: Hội thao khoa CNTT..." />
              </div>

              {scope === "internal" ? (
                <>
                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả hoạt động</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Mô tả nội dung, thời gian và địa điểm..." className="min-h-24" />
                  </div>
                  <OrganizerPicker
                    value={organizerName}
                    onChange={setOrganizerName}
                    defaultNewType="Đoàn - Hội"
                  />

                  {/* Points and Criterion */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="points">Điểm rèn luyện</Label>
                      <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} required min="1" max="25" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="criterion">Tiêu chí áp dụng</Label>
                      <Select value={criterionId} onValueChange={setCriterionId}>
                        <SelectTrigger id="criterion"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {criteria.map(c => <SelectItem key={c.id} value={c.id}>{c.code}. {c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants">Số người được đăng ký tối đa</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      required
                      min={Math.max(1, registeredCount)}
                      step="1"
                    />
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">
                        Hiện có {registeredCount} sinh viên đăng ký. Bạn có thể tăng hoặc giảm giới hạn,
                        nhưng không thấp hơn số đã đăng ký.
                      </p>
                    )}
                  </div>

                  {/* Date and Times */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-1">
                      <Label htmlFor="date">Ngày tổ chức</Label>
                      <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Giờ bắt đầu</Label>
                      <Input
                        id="startTime"
                        type="text"
                        value={startTime}
                        readOnly
                        onClick={() => { setTimePickerTarget('start'); setIsTimePickerOpen(true); }}
                        className="cursor-pointer font-mono"
                        required
                        placeholder="Chọn giờ"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Giờ kết thúc</Label>
                      <Input
                        id="endTime"
                        type="text"
                        value={endTime}
                        readOnly
                        onClick={() => { setTimePickerTarget('end'); setIsTimePickerOpen(true); }}
                        className="cursor-pointer font-mono"
                        required
                        placeholder="Chọn giờ"
                      />
                    </div>
                  </div>

                  {/* Scope limits */}
                  <div className="space-y-2 border-t pt-4">
                    <Label>Phạm vi sinh viên có thể tham gia</Label>
                    <Select value={scopeType} onValueChange={(val: any) => setScopeType(val)}>
                      <SelectTrigger id="scopeType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toàn trường</SelectItem>
                        <SelectItem value="class">Theo Lớp</SelectItem>
                        <SelectItem value="club">Theo Câu lạc bộ (CLB)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scopeType === "class" && (
                    <div className="space-y-1.5 mt-2">
                      <Label>Chọn lớp áp dụng (chọn một hoặc nhiều)</Label>
                      <Input
                        type="text"
                        placeholder="Tìm kiếm lớp học..."
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                        className="h-8 text-xs mb-1.5"
                      />
                      <div className="flex gap-2 mb-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="secondary"
                          onClick={handleSelectAllClasses}
                          className="text-[10px] h-7 px-2"
                        >
                          Chọn tất cả ({filteredClassList.length})
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={handleDeselectAllClasses}
                          className="text-[10px] h-7 px-2"
                        >
                          Bỏ chọn kết quả lọc
                        </Button>
                      </div>
                      <div className="border rounded-md p-2 max-h-36 overflow-y-auto space-y-1.5 bg-background">
                        {filteredClassList.map(cls => (
                          <div key={cls.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`class-${cls.id}`}
                              checked={selectedClasses.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClasses([...selectedClasses, cls.id]);
                                } else {
                                  setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                                }
                              }}
                              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor={`class-${cls.id}`} className="text-sm font-medium leading-none cursor-pointer">
                              {cls.name} ({cls.faculty})
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scopeType === "club" && (
                    <div className="space-y-1.5 mt-2">
                      <Label>Chọn Câu lạc bộ áp dụng (chọn một hoặc nhiều)</Label>
                      <Input
                        type="text"
                        placeholder="Tìm kiếm câu lạc bộ..."
                        value={clubSearch}
                        onChange={(e) => setClubSearch(e.target.value)}
                        className="h-8 text-xs mb-1.5"
                      />
                      <div className="flex gap-2 mb-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="secondary"
                          onClick={handleSelectAllClubs}
                          className="text-[10px] h-7 px-2"
                        >
                          Chọn tất cả ({filteredClubList.length})
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={handleDeselectAllClubs}
                          className="text-[10px] h-7 px-2"
                        >
                          Bỏ chọn kết quả lọc
                        </Button>
                      </div>
                      <div className="border rounded-md p-2 max-h-36 overflow-y-auto space-y-1.5 bg-background">
                        {filteredClubList.map(club => (
                          <div key={club.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`club-${club.id}`}
                              checked={selectedClubs.includes(club.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClubs([...selectedClubs, club.id]);
                                } else {
                                  setSelectedClubs(selectedClubs.filter(id => id !== club.id));
                                }
                              }}
                              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor={`club-${club.id}`} className="text-sm font-medium leading-none cursor-pointer">
                              {club.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pre-registration checkbox */}
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isRegistrationRequired"
                        checked={isRegistrationRequired}
                        onChange={(e) => setIsRegistrationRequired(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <Label htmlFor="isRegistrationRequired" className="cursor-pointer text-sm font-medium">
                        Cho phép sinh viên đăng ký trước?
                      </Label>
                    </div>

                    {isRegistrationRequired && (
                      <div className="grid grid-cols-1 gap-4 mt-3 p-4 bg-muted/40 rounded-lg animate-in fade-in-50 duration-200">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Bắt đầu đăng ký trước</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="date"
                              value={registrationStartDate}
                              onChange={(e) => setRegistrationStartDate(e.target.value)}
                              onClick={(e) => e.currentTarget.showPicker()}
                              required={isRegistrationRequired}
                              className="h-9 text-xs"
                            />
                            <Input
                              type="text"
                              value={registrationStartTime}
                              readOnly
                              onClick={() => { setTimePickerTarget('regStart'); setIsTimePickerOpen(true); }}
                              className="cursor-pointer font-mono h-9 text-xs"
                              required={isRegistrationRequired}
                              placeholder="Chọn giờ"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Kết thúc đăng ký trước</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="date"
                              value={registrationEndDate}
                              onChange={(e) => setRegistrationEndDate(e.target.value)}
                              onClick={(e) => e.currentTarget.showPicker()}
                              required={isRegistrationRequired}
                              className="h-9 text-xs"
                            />
                            <Input
                              type="text"
                              value={registrationEndTime}
                              readOnly
                              onClick={() => { setTimePickerTarget('regEnd'); setIsTimePickerOpen(true); }}
                              className="cursor-pointer font-mono h-9 text-xs"
                              required={isRegistrationRequired}
                              placeholder="Chọn giờ"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
              <>
                {/* Off-campus options */}
                  <OrganizerPicker
                    value={organizerName}
                    onChange={setOrganizerName}
                    defaultNewType="Đơn vị ngoài trường"
                  />
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Địa điểm diễn ra</Label>
                      <Input id="location" value={location} onChange={e => setLocation(e.target.value)} required placeholder="Ví dụ: Quận 9, TPHCM..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="points">Điểm đề xuất</Label>
                      <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} required min="1" max="30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activityType">Loại hoạt động ngoài trường</Label>
                      <Select value={activityType} onValueChange={setActivityType}>
                        <SelectTrigger id="activityType"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hoạt động xã hội">Hoạt động xã hội</SelectItem>
                          <SelectItem value="Cuộc thi khoa học">Cuộc thi khoa học</SelectItem>
                          <SelectItem value="Hoạt động thể thao">Hoạt động thể thao</SelectItem>
                          <SelectItem value="Kỹ năng mềm">Kỹ năng mềm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Ngày bắt đầu</Label>
                      <Input id="startDate" type="date" value={date} onChange={e => setDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Ngày kết thúc</Label>
                      <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả / Ghi chú</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Mô tả chi tiết nội dung tham gia..." />
                  </div>
                </>
              )}

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate("/activities")}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-gradient-primary text-white">
                  {isEditing ? "Cập nhật hoạt động" : "Tạo hoạt động"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <RadialTimePicker
        open={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        value={
          timePickerTarget === 'start' ? startTime :
          timePickerTarget === 'end' ? endTime :
          timePickerTarget === 'regStart' ? registrationStartTime :
          registrationEndTime
        }
        onChange={(val) => {
          if (timePickerTarget === 'start') {
            setStartTime(val);
          } else if (timePickerTarget === 'end') {
            setEndTime(val);
          } else if (timePickerTarget === 'regStart') {
            setRegistrationStartTime(val);
          } else if (timePickerTarget === 'regEnd') {
            setRegistrationEndTime(val);
          }
        }}
        title={
          timePickerTarget === 'start' ? "Chọn giờ bắt đầu hoạt động" :
          timePickerTarget === 'end' ? "Chọn giờ kết thúc hoạt động" :
          timePickerTarget === 'regStart' ? "Chọn giờ bắt đầu đăng ký" :
          "Chọn giờ kết thúc đăng ký"
        }
      />
    </div>
  );
}
