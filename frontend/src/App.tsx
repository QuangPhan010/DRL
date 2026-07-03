import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Approvals from "./pages/Approvals";
import MyScores from "./pages/MyScores";
import Criteria from "./pages/Criteria";
import SettingsPage from "./pages/Settings";
import Activities from "./pages/Activities";
import ActivityDetail from "./pages/ActivityDetail";
import ActivityForm from "./pages/ActivityForm";
import ClassReview from "./pages/ClassReview";
import DataSync from "./pages/DataSync";
import AcademicTranscriptImport from "./pages/AcademicTranscriptImport";
import Classes from "./pages/Classes";
import Profile from "./pages/Profile";
import EvaluationSession from "./pages/EvaluationSession";
import Organizations from "./pages/Organizations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
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
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
