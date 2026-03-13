import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
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
import AdminCommitsLog from "./pages/AdminCommitsLog";
import AFITPDFs from "./pages/AFITPDFs";
import SchoolStore from "./pages/SchoolStore";
import SemesterSelection from "./pages/SemesterSelection";
import DepartmentCourses from "./pages/DepartmentCourses";
import CourseLectureNotes from "./pages/CourseLectureNotes";
import RepUpload from "./pages/RepUpload";
import RepProfile from "./pages/RepProfile";
import UserProfile from "./pages/UserProfile";
import AIFeatures from "./pages/AIFeatures";
import Notifications from "./pages/Notifications";
import CommunityUpload from "./pages/CommunityUpload";
import AdminUploads from "./pages/AdminUploads";
import { RepModeration } from "./pages/RepModeration";
import NotFound from "./pages/NotFound";
import { ActivityRouteTracker } from "@/components/ActivityRouteTracker";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="pdfnest-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ActivityRouteTracker />
          <Routes>
            <Route path="/" element={<Index />} />
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
            <Route path="/admin/logs" element={<AdminSessionLogs />} />
            <Route path="/admin/commits" element={<AdminCommitsLog />} />
            <Route path="/admin/uploads" element={<AdminUploads />} />
            <Route path="/admin/user/:userId" element={<AdminUserDetail />} />
            <Route path="/afit-pdfs" element={<AFITPDFs />} />
            <Route path="/school-store" element={<SchoolStore />} />
            <Route path="/afit-pdfs/:deptSlug" element={<SemesterSelection />} />
            <Route path="/afit-pdfs/:deptSlug/semester/:semester" element={<DepartmentCourses />} />
            <Route path="/afit-pdfs/:deptSlug/semester/:semester/:courseCode" element={<CourseLectureNotes />} />
            <Route path="/rep/upload" element={<RepUpload />} />
            <Route path="/rep/moderation" element={<RepModeration />} />
            <Route path="/rep/:userId" element={<RepProfile />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/ai-features" element={<AIFeatures />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/contribute" element={<CommunityUpload />} />
            <Route path="/community-upload" element={<CommunityUpload />} />
            <Route path="/contribute-material" element={<CommunityUpload />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
