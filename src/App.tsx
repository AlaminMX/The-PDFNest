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
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminActivityLogs from "./pages/AdminActivityLogs";
import AFITPDFs from "./pages/AFITPDFs";
import SchoolStore from "./pages/SchoolStore";
import DepartmentCourses from "./pages/DepartmentCourses";
import CourseLectureNotes from "./pages/CourseLectureNotes";
import RepUpload from "./pages/RepUpload";
import RepProfile from "./pages/RepProfile";
import UserProfile from "./pages/UserProfile";
import AIFeatures from "./pages/AIFeatures";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="pdfnest-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password-success" element={<PasswordResetSuccess />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/reps" element={<AdminReps />} />
            <Route path="/admin/logs" element={<AdminActivityLogs />} />
            <Route path="/admin/user/:userId" element={<AdminUserDetail />} />
            <Route path="/afit-pdfs" element={<AFITPDFs />} />
            <Route path="/school-store" element={<SchoolStore />} />
            <Route path="/afit-pdfs/:deptSlug" element={<DepartmentCourses />} />
            <Route path="/afit-pdfs/:deptSlug/:courseCode" element={<CourseLectureNotes />} />
            <Route path="/rep/upload" element={<RepUpload />} />
            <Route path="/rep/:userId" element={<RepProfile />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/ai-features" element={<AIFeatures />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
