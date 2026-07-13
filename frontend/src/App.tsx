import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { lazy, Suspense } from "react";
import Loading from "./pages/Loading";

// Lazy-loaded pages
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const Approvals = lazy(() => import("./pages/Approvals"));
const Criteria = lazy(() => import("./pages/Criteria"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Activities = lazy(() => import("./pages/Activities"));
const ActivityDetail = lazy(() => import("./pages/ActivityDetail"));
const ActivityForm = lazy(() => import("./pages/ActivityForm"));
const ClassReview = lazy(() => import("./pages/ClassReview"));
const AcademicTranscriptImport = lazy(() => import("./pages/AcademicTranscriptImport"));
const Classes = lazy(() => import("./pages/Classes"));
const Profile = lazy(() => import("./pages/Profile"));
const EvaluationSession = lazy(() => import("./pages/EvaluationSession"));
const Organizations = lazy(() => import("./pages/Organizations"));
const Reports = lazy(() => import("./pages/Reports")); // Reporting Center Page
const ErrorPage = lazy(() => import("./pages/ErrorPage"));
const EmailPreview = lazy(() => import("./pages/EmailPreview"));
const Rooms = lazy(() => import("./pages/Rooms"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { navItems, managementItems } from "@/components/layout/AppSidebar";

const queryClient = new QueryClient();

function RoleProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const path = location.pathname;
  const allItems = [...navItems, ...managementItems];
  
  let matchedItem = allItems.find(item => item.url === path);
  if (!matchedItem) {
    matchedItem = allItems.find(item => item.url !== "/" && path.startsWith(item.url));
  }

  if (matchedItem) {
    const rolesAllowed = matchedItem.roles;
    const userRole = user.role;
    if (!rolesAllowed.includes(userRole as any)) {
      return (
        <ErrorPage 
          code="403" 
          title="Không có quyền truy cập" 
          message={`Tài khoản với vai trò '${user.role}' không được phép truy cập chức năng này.`} 
        />
      );
    }
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/loading" element={<Loading />} />
              <Route path="/error" element={<ErrorPage />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<RoleProtectedRoute><Dashboard /></RoleProtectedRoute>} />
                <Route path="/students" element={<RoleProtectedRoute><Classes /></RoleProtectedRoute>} />
                <Route path="/classes" element={<RoleProtectedRoute><Classes /></RoleProtectedRoute>} />
                <Route path="/approvals" element={<RoleProtectedRoute><Approvals /></RoleProtectedRoute>} />
                <Route path="/my-scores" element={<Navigate to="/" replace />} />
                <Route path="/criteria" element={<RoleProtectedRoute><Criteria /></RoleProtectedRoute>} />
                <Route path="/settings" element={<RoleProtectedRoute><SettingsPage /></RoleProtectedRoute>} />
                <Route path="/activities" element={<RoleProtectedRoute><Activities /></RoleProtectedRoute>} />
                <Route path="/activities/create" element={<RoleProtectedRoute><ActivityForm /></RoleProtectedRoute>} />
                <Route path="/activities/:id" element={<RoleProtectedRoute><ActivityDetail /></RoleProtectedRoute>} />
                <Route path="/activities/:id/edit" element={<RoleProtectedRoute><ActivityForm /></RoleProtectedRoute>} />
                <Route path="/class-review" element={<RoleProtectedRoute><ClassReview /></RoleProtectedRoute>} />
                <Route path="/academic-transcript-import" element={<RoleProtectedRoute><AcademicTranscriptImport /></RoleProtectedRoute>} />
                <Route path="/evaluation-sessions/create" element={<RoleProtectedRoute><EvaluationSession /></RoleProtectedRoute>} />
                <Route path="/organizations" element={<RoleProtectedRoute><Organizations /></RoleProtectedRoute>} />
                <Route path="/rooms" element={<RoleProtectedRoute><Rooms /></RoleProtectedRoute>} />
                <Route path="/profile" element={<RoleProtectedRoute><Profile /></RoleProtectedRoute>} />
                <Route path="/reports" element={<RoleProtectedRoute><Reports /></RoleProtectedRoute>} />
                <Route path="/email-preview" element={<RoleProtectedRoute><EmailPreview /></RoleProtectedRoute>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
