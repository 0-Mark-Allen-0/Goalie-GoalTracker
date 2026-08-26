// frontend/src/App.tsx
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import Home from "@/Home";
import { Dashboard } from "@/Dashboard";
import { EntriesPage } from "@/EntriesPage";
import { GoalsPage } from "@/GoalsPage";
import { Insights } from "@/Insights";
import { SettingsPage } from "@/SettingsPage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/income" element={<EntriesPage kind="income" />} />
        <Route path="/expenses" element={<EntriesPage kind="expense" />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/ledger" element={<EntriesPage />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Previously missing, which meant every toast in the app silently did nothing. */}
      <Toaster position="bottom-right" richColors closeButton />
    </Router>
  );
}

export default App;
