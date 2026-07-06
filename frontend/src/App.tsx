import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
const MyScores = lazy(() => import("./pages/MyScores"));
const Criteria = lazy(() => import("./pages/Criteria"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Activities = lazy(() => import("./pages/Activities"));
const ActivityDetail = lazy(() => import("./pages/ActivityDetail"));
const ActivityForm = lazy(() => import("./pages/ActivityForm"));
const ClassReview = lazy(() => import("./pages/ClassReview"));
const DataSync = lazy(() => import("./pages/DataSync"));
const AcademicTranscriptImport = lazy(() => import("./pages/AcademicTranscriptImport"));
const Classes = lazy(() => import("./pages/Classes"));
const Profile = lazy(() => import("./pages/Profile"));
const EvaluationSession = lazy(() => import("./pages/EvaluationSession"));
const Organizations = lazy(() => import("./pages/Organizations"));
const ErrorPage = lazy(() => import("./pages/ErrorPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/loading" element={<Loading />} />
              <Route path="/error" element={<ErrorPage />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/my-scores" element={<MyScores />} />
                <Route path="/criteria" element={<Criteria />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/activities/create" element={<ActivityForm />} />
                <Route path="/activities/:id" element={<ActivityDetail />} />
                <Route path="/activities/:id/edit" element={<ActivityForm />} />
                <Route path="/class-review" element={<ClassReview />} />
                <Route path="/data-sync" element={<DataSync />} />
                <Route path="/academic-transcript-import" element={<AcademicTranscriptImport />} />
                <Route path="/evaluation-sessions/create" element={<EvaluationSession />} />
                <Route path="/organizations" element={<Organizations />} />
                <Route path="/profile" element={<Profile />} />
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
