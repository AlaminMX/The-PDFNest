/**
 * App.tsx  (MODIFIED)
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACE THIS FILE AT:  src/App.tsx
 *                      (replaces your existing src/App.tsx)
 *
 * CHANGES vs original:
 *   1. Import DomainRedirect.
 *   2. Mount <DomainRedirect /> inside <BrowserRouter>, right next to the
 *      existing <RecoveryRedirect /> and <ActivityRouteTracker />.
 *
 * Everything else is identical to your original file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Component, ErrorInfo, ReactNode, lazy, Suspense } from "react";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PasswordResetSuccess = lazy(() => import("./pages/PasswordResetSuccess"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminReps = lazy(() => import("./pages/AdminReps"));
const AdminDepartments = lazy(() => import("./pages/AdminDepartments"));
const AdminBanners = lazy(() => import("./pages/AdminBanners"));
const AdminCategories = lazy(() => import("./pages/AdminCategories"));
const AdminUserDetail = lazy(() => import("./pages/AdminUserDetail"));
const AdminActivity = lazy(() => import("./pages/AdminActivity"));
const AFITPDFs = lazy(() => import("./pages/AFITPDFs"));
const FacultySelection = lazy(() => import("./pages/FacultySelection"));
const AdminFaculties = lazy(() => import("./pages/AdminFaculties"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const AdminProjects = lazy(() => import("./pages/AdminProjects"));
const SemesterSelection = lazy(() => import("./pages/SemesterSelection"));
const LevelSelection = lazy(() => import("./pages/LevelSelection"));
const StandaloneDepartment = lazy(() => import("./pages/StandaloneDepartment"));
const StandaloneDocuments = lazy(() => import("./pages/StandaloneDocuments"));
const DepartmentCourses = lazy(() => import("./pages/DepartmentCourses"));
const CourseLectureNotes = lazy(() => import("./pages/CourseLectureNotes"));
const RepUpload = lazy(() => import("./pages/RepUpload"));
const RepProfile = lazy(() => import("./pages/RepProfile"));
const AdminDepartmentLevels = lazy(() => import("./pages/AdminDepartmentLevels"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CommunityUpload = lazy(() => import("./pages/CommunityUpload"));
const AdminUploads = lazy(() => import("./pages/AdminUploads"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const PQLevel = lazy(() => import("./pages/PQLevel"));
const PQSemester = lazy(() => import("./pages/PQSemester"));
const PQCourses = lazy(() => import("./pages/PQCourses"));
const PQFiles = lazy(() => import("./pages/PQFiles"));
const AdminPastQuestions = lazy(() => import("./pages/AdminPastQuestions"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { ActivityRouteTracker } from "@/components/ActivityRouteTracker";
import { RecoveryRedirect } from "@/components/RecoveryRedirect";
import { AdminLayout } from "@/components/AdminShell";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

// ── NEW: domain-based institution redirect ───────────────────────────────────
import { DomainRedirect } from "@/components/DomainRedirect";
// ────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});

interface ErrorBoundaryState { hasError: boolean; error: Error | null }
class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}
              className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminRealtimeMount() {
  useAdminNotifications();
  return null;
}

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="pdfnest-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RecoveryRedirect />
            <ActivityRouteTracker />
            <AdminRealtimeMount />

            {/* ── Domain-based institution redirect (NEW) ────────────────── */}
            <DomainRedirect />
            {/* ────────────────────────────────────────────────────────────── */}

            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><Onboarding /></ProtectedRoute>} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/reset-password-success" element={<PasswordResetSuccess />} />
                <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="reps" element={<AdminReps />} />
                  <Route path="departments" element={<AdminDepartments />} />
                  <Route path="departments/:deptId/levels" element={<AdminDepartmentLevels />} />
                  <Route path="banners" element={<AdminBanners />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="activity" element={<AdminActivity />} />
                  <Route path="user/:userId" element={<AdminUserDetail />} />
                  <Route path="faculties" element={<AdminFaculties />} />
                  <Route path="projects" element={<AdminProjects />} />
                  <Route path="uploads" element={<AdminUploads />} />
                  <Route path="past-questions" element={<AdminPastQuestions />} />
                </Route>
                <Route path="/afit-pdfs" element={<FacultySelection />} />
                <Route path="/afit-pdfs/:facultySlug" element={<AFITPDFs />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/afit-pdfs/:facultySlug/:deptSlug" element={<LevelSelection />} />
                <Route path="/afit-pdfs/:facultySlug/:deptSlug/level/:level" element={<SemesterSelection />} />
                <Route path="/afit-pdfs/:facultySlug/:deptSlug/level/:level/semester/:semester" element={<DepartmentCourses />} />
                <Route path="/afit-pdfs/:facultySlug/:deptSlug/level/:level/semester/:semester/:courseCode" element={<CourseLectureNotes />} />
                {/* Standalone (no-faculty) department routes */}
                <Route path="/afit-pdfs/dept/:deptSlug" element={<StandaloneDepartment />} />
                <Route path="/afit-pdfs/dept/:deptSlug/:section" element={<StandaloneDocuments />} />
                <Route path="/afit-pdfs/dept/:deptSlug/level/:level" element={<SemesterSelection />} />
                <Route path="/afit-pdfs/dept/:deptSlug/level/:level/semester/:semester" element={<DepartmentCourses />} />
                <Route path="/afit-pdfs/dept/:deptSlug/level/:level/semester/:semester/:courseCode" element={<CourseLectureNotes />} />
                <Route path="/rep/upload" element={<ProtectedRoute><RepUpload /></ProtectedRoute>} />
                <Route path="/rep/:userId" element={<ProtectedRoute><RepProfile /></ProtectedRoute>} />
                <Route path="/user/:userId" element={<PublicProfile />} />
                <Route path="/profile" element={
                  <ProtectedRoute pendingFallback={<ProfileSkeleton />}>
                    <Suspense fallback={<ProfileSkeleton />}>
                      <UserProfile />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/contribute" element={<ProtectedRoute><CommunityUpload /></ProtectedRoute>} />
                <Route path="/past-questions" element={<PQLevel />} />
                <Route path="/past-questions/level/:level" element={<PQSemester />} />
                <Route path="/past-questions/level/:level/semester/:semester" element={<PQCourses />} />
                <Route path="/past-questions/level/:level/semester/:semester/:courseCode" element={<PQFiles />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
