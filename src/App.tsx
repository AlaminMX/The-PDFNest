import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RamadanDecoration } from "@/components/RamadanDecoration";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
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
import AdminUploads from "./pages/AdminUploads";
import SemesterSelection from "./pages/SemesterSelection";
import DepartmentCourses from "./pages/DepartmentCourses";
import CourseLectureNotes from "./pages/CourseLectureNotes";
import RepUpload from "./pages/RepUpload";
import RepModeration from "./pages/RepModeration";
import RepProfile from "./pages/RepProfile";
import UserProfile from "./pages/UserProfile";
import AIFeatures from "./pages/AIFeatures";
import Notifications from "./pages/Notifications";
import CommunityUpload from "./pages/CommunityUpload";
import NotFound from "./pages/NotFound";
import { ActivityRouteTracker } from "@/components/ActivityRouteTracker";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="pdfnest-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RamadanDecoration />
        <BrowserRouter>
          <ActivityRouteTracker />
          <AppErrorBoundary>
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
              <Route path="/afit-pdfs/:facultySlug/:deptSlug" element={<SemesterSelection />} />
              <Route path="/afit-pdfs/:facultySlug/:deptSlug/semester/:semester" element={<DepartmentCourses />} />
              <Route path="/afit-pdfs/:facultySlug/:deptSlug/semester/:semester/:courseCode" element={<CourseLectureNotes />} />
              <Route path="/rep/upload" element={<RepUpload />} />
              <Route path="/rep/moderation" element={<RepModeration />} />
              <Route path="/rep/:userId" element={<RepProfile />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/ai-features" element={<AIFeatures />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/contribute" element={<CommunityUpload />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
