import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Search, Users, FileText, HardDrive, ChevronRight, ArrowUpDown, Filter,
  Building2, LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDepartments } from "@/hooks/useDepartments";
import { AdminShell } from "@/components/AdminShell";

interface UserData {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string;
  pdfCount: number;
  totalStorage: number;
  createdAt: string;
  departmentId: string | null;
  departmentName: string | null;
  level: number | null;
  nickname: string | null;
  preferredTheme: string | null;
  usageReason: string | null;
  dateOfBirth: string | null;
  phoneNumber: string | null;
}

type SortField = "name" | "storage" | "pdfCount" | "createdAt" | "department";
type SortOrder = "asc" | "desc";
type FilterType = "all" | "withPdfs" | "noPdfs" | "over100MB" | "over1GB" | "recentUpload";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function getDisplayName(email: string, fullName: string | null): string {
  if (fullName && fullName.trim()) {
    return fullName;
  }
  return email.split("@")[0];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


function NewDepartmentsLabelControl() {
  const { settings, updateSetting } = useAppSettings();
  const [label, setLabel] = useState(settings.new_departments_label);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLabel(settings.new_departments_label);
  }, [settings.new_departments_label]);

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    const success = await updateSetting("new_departments_label_enabled", checked ? "true" : "false");
    toast[success ? "success" : "error"](success ? (checked ? "New departments label enabled" : "New departments label hidden") : "Failed to update setting");
    setSaving(false);
  };

  const handleSave = async () => {
    const trimmed = label.trim() || "New Departments";
    setSaving(true);
    const success = await updateSetting("new_departments_label", trimmed);
    toast[success ? "success" : "error"](success ? "New departments label updated" : "Failed to update label");
    setSaving(false);
  };

  return (
    <Card className="p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2 md:max-w-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">New departments separator</p>
              <p className="text-xs text-muted-foreground">Control the label shown between faculties and standalone departments.</p>
            </div>
            <Switch
              checked={settings.new_departments_label_enabled}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-departments-label">Label text</Label>
            <Input
              id="new-departments-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              disabled={saving || !settings.new_departments_label_enabled}
              maxLength={40}
            />
          </div>
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !settings.new_departments_label_enabled || label.trim() === settings.new_departments_label}
        >
          Save Label
        </Button>
      </div>
    </Card>
  );
}


export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalPDFs, setTotalPDFs] = useState(0);
  const [totalStorage, setTotalStorage] = useState(0);

  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const { departments } = useDepartments();

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          nickname,
          preferred_theme,
          usage_reason,
          date_of_birth,
          phone_number,
          created_at,
          department_id,
          level,
          departments (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: pdfData, error: pdfError } = await supabase
        .from("pdf_files")
        .select("id, user_id, file_size");

      if (pdfError) throw pdfError;

      const pdfsByUser = new Map<string, { count: number; storage: number }>();
      let totalPdfCount = 0;
      let totalStorageBytes = 0;

      pdfData?.forEach((pdf) => {
        totalPdfCount++;
        totalStorageBytes += pdf.file_size || 0;

        if (!pdfsByUser.has(pdf.user_id)) {
          pdfsByUser.set(pdf.user_id, { count: 0, storage: 0 });
        }

        const userData = pdfsByUser.get(pdf.user_id)!;
        userData.count++;
        userData.storage += pdf.file_size || 0;
      });

      setTotalPDFs(totalPdfCount);
      setTotalStorage(totalStorageBytes);

      const userList: UserData[] = (profilesData || []).map((profile) => {
        const pdfStats = pdfsByUser.get(profile.id) || { count: 0, storage: 0 };

        return {
          id: profile.id,
          email: profile.email || "Unknown",
          fullName: profile.full_name,
          displayName: getDisplayName(profile.email || "Unknown", profile.full_name),
          pdfCount: pdfStats.count,
          totalStorage: pdfStats.storage,
          createdAt: profile.created_at,
          departmentId: profile.department_id,
          departmentName: (profile as any).departments?.name || null,
          level: profile.level ?? null,
          nickname: profile.nickname || null,
          preferredTheme: profile.preferred_theme || null,
          usageReason: profile.usage_reason || null,
          dateOfBirth: (profile as any).date_of_birth || null,
          phoneNumber: profile.phone_number || null,
        };
      });

      setUsers(userList);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (departmentFilter !== "all") {
      if (departmentFilter === "none") {
        filtered = filtered.filter((user) => !user.departmentId);
      } else {
        filtered = filtered.filter((user) => user.departmentId === departmentFilter);
      }
    }

    switch (filterType) {
      case "withPdfs":
        filtered = filtered.filter((user) => user.pdfCount > 0);
        break;
      case "noPdfs":
        filtered = filtered.filter((user) => user.pdfCount === 0);
        break;
      case "over100MB":
        filtered = filtered.filter((user) => user.totalStorage > 100 * 1024 * 1024);
        break;
      case "over1GB":
        filtered = filtered.filter((user) => user.totalStorage > 1024 * 1024 * 1024);
        break;
      case "recentUpload": {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter((user) => new Date(user.createdAt) >= sevenDaysAgo);
        break;
      }
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case "storage":
          comparison = a.totalStorage - b.totalStorage;
          break;
        case "pdfCount":
          comparison = a.pdfCount - b.pdfCount;
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "department":
          comparison = (a.departmentName || "zzz").localeCompare(b.departmentName || "zzz");
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [users, searchQuery, sortField, sortOrder, filterType, departmentFilter]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  if (loading) {
    return (
      <AdminShell title="Admin Dashboard" subtitle="Manage all users and PDFs" icon={<LayoutDashboard className="h-5 w-5 text-primary" />}>
        <div className="flex items-center justify-center py-24">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Admin Dashboard" subtitle="Manage all users and PDFs" icon={<LayoutDashboard className="h-5 w-5 text-primary" />}>
      <div className="p-4 md:p-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total PDFs</p>
                  <p className="text-2xl font-bold">{totalPDFs}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <HardDrive className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Storage</p>
                  <p className="text-2xl font-bold">{formatBytes(totalStorage)}</p>
                </div>
              </div>
            </Card>
          </div>

          <NewDepartmentsLabelControl />

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="storage">Storage Size</SelectItem>
                    <SelectItem value="pdfCount">PDF Count</SelectItem>
                    <SelectItem value="createdAt">Join Date</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSortOrder}
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  <ArrowUpDown
                    className={`h-4 w-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                  />
                </Button>

                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.icon && <span className="mr-1">{dept.icon}</span>}
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="withPdfs">With PDFs</SelectItem>
                    <SelectItem value="noPdfs">No PDFs</SelectItem>
                    <SelectItem value="over100MB">Over 100MB</SelectItem>
                    <SelectItem value="over1GB">Over 1GB</SelectItem>
                    <SelectItem value="recentUpload">Recently Joined (7 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(filterType !== "all" || searchQuery || departmentFilter !== "all") && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>

                {searchQuery && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery("")}>
                    Search: "{searchQuery}" ×
                  </Badge>
                )}

                {departmentFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => setDepartmentFilter("all")}
                  >
                    Dept: {departmentFilter === "none" ? "None" : departments.find((d) => d.id === departmentFilter)?.name} ×
                  </Badge>
                )}

                {filterType !== "all" && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterType("all")}>
                    {filterType === "withPdfs" && "With PDFs"}
                    {filterType === "noPdfs" && "No PDFs"}
                    {filterType === "over100MB" && "Over 100MB"}
                    {filterType === "over1GB" && "Over 1GB"}
                    {filterType === "recentUpload" && "Recently Joined"}
                    {" ×"}
                  </Badge>
                )}

                <span className="text-sm text-muted-foreground">
                  ({filteredAndSortedUsers.length} of {users.length} users)
                </span>
              </div>
            )}
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden md:table-cell">Level</TableHead>
                  <TableHead className="hidden xl:table-cell">DOB</TableHead>
                  <TableHead className="hidden xl:table-cell">Phone</TableHead>
                  <TableHead className="hidden xl:table-cell">Why PDFNest</TableHead>
                  <TableHead className="hidden xl:table-cell">Joined</TableHead>
                  <TableHead className="text-center">PDFs</TableHead>
                  <TableHead className="text-right">Total Size</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredAndSortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedUsers.map((user, index) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/admin/user/${user.id}`)}
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>

                      <TableCell className="font-medium">
                        {user.displayName}
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {user.email}
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        {user.departmentName ? (
                          <Badge variant="outline" className="font-normal">
                            {user.departmentName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {user.level ? `${user.level} Level` : "—"}
                      </TableCell>

                      <TableCell className="hidden xl:table-cell text-muted-foreground">
                        {user.dateOfBirth ? formatDate(user.dateOfBirth) : "—"}
                      </TableCell>

                      <TableCell className="hidden xl:table-cell text-muted-foreground">
                        {user.phoneNumber || "—"}
                      </TableCell>

                      <TableCell className="hidden xl:table-cell text-muted-foreground max-w-[150px] truncate">
                        {user.usageReason || "—"}
                      </TableCell>

                      <TableCell className="hidden xl:table-cell text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant={user.pdfCount > 0 ? "default" : "secondary"}>
                          {user.pdfCount}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {formatBytes(user.totalStorage)}
                      </TableCell>

                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        <footer className="py-6 border-t border-border/40">
          <div className="px-4 md:px-6 text-center">
            <p className="text-xs text-muted-foreground/60">
              Made with love ❤️ by Nexel
            </p>
          </div>
        </footer>
      </div>
    </AdminShell>
  );
}
