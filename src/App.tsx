import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RamadanDecoration } from "@/components/RamadanDecoration";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Component, ErrorInfo, ReactNode } from "react";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ResetPassword from "./pages/ResetPassword";
import PasswordResetSuccess from "./pages/PasswordResetSuccess";
import AdminDashboard from "./pages/AdminDashboard";
import AdminReps from "./pages/AdminReps";
import AdminDepartments from "./pages/AdminDepartments";
import AdminBanners from "./pages/AdminBanners";
import AdminCategories from "./pages/AdminCategories";
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminSessionLogs from "./pages/AdminSessionLogs";
import AdminActivityLogs from "./pages/AdminActivityLogs";
import AFITPDFs from "./pages/AFITPDFs";
import FacultySelection from "./pages/FacultySelection";
import AdminFaculties from "./pages/AdminFaculties";
import SchoolStore from "./pages/SchoolStore";
import AdminWaitlist from "./pages/AdminWaitlist";
import SemesterSelection from "./pages/SemesterSelection";
import LevelSelection from "./pages/LevelSelection";
import DepartmentCourses from "./pages/DepartmentCourses";
import CourseLectureNotes from "./pages/CourseLectureNotes";
import RepUpload from "./pages/RepUpload";
import RepProfile from "./pages/RepProfile";
import UserProfile from "./pages/UserProfile";
import AIFeatures from "./pages/AIFeatures";
import Notifications from "./pages/Notifications";
import CommunityUpload from "./pages/CommunityUpload";
import AdminUploads from "./pages/AdminUploads";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";
import { ActivityRouteTracker } from "@/components/ActivityRouteTracker";

// ── QueryClient: suppress thrown errors so a single query failure
//    never crashes the entire app into a blank screen ──────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Don't throw to ErrorBoundary - handle errors locally per query
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});

// ── ErrorBoundary: catches any unhandled render/component errors ──
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

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="pdfnest-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RamadanDecoration />
          <BrowserRouter>
            <ActivityRouteTracker />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/reset-password-success" element={<PasswordResetSuccess />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/reps" element={<AdminReps />} />
              <Route path="/admin/departments" element={<AdminDepartments />} />
              <Route path="/admin/banners" element={<AdminBanners />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/logs" element={<AdminActivityLogs />} />
              <Route path="/admin/sessions" element={<AdminSessionLogs />} />
              <Route path="/admin/user/:userId" element={<AdminUserDetail />} />
              <Route path="/admin/faculties" element={<AdminFaculties />} />
              <Route path="/admin/waitlist" element={<AdminWaitlist />} />
              <Route path="/admin/uploads" element={<AdminUploads />} />
              <Route path="/afit-pdfs" element={<FacultySelection />} />
              <Route path="/afit-pdfs/:facultySlug" element={<AFITPDFs />} />
              <Route path="/school-store" element={<SchoolStore />} />
              <Route path="/afit-pdfs/:facultySlug/:deptSlug" element={<LevelSelection />} />
              <Route path="/afit-pdfs/:facultySlug/:deptSlug/level/:level" element={<SemesterSelection />} />
              <Route path="/afit-pdfs/:facultySlug/:deptSlug/level/:level/semester/:semester" element={<DepartmentCourses />} />
              <Route path="/afit-pdfs/:facultySlug/:deptSlug/level/:level/semester/:semester/:courseCode" element={<CourseLectureNotes />} />
              <Route path="/rep/upload" element={<RepUpload />} />
              <Route path="/rep/:userId" element={<RepProfile />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/ai-features" element={<AIFeatures />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/contribute" element={<CommunityUpload />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
