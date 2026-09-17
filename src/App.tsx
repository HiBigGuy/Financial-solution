import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { LandingPage } from "@/pages/landing/LandingPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { SalaryPage } from "@/pages/salary/SalaryPage";
import { CardsPage } from "@/pages/cards/CardsPage";
import { InvestmentsPage } from "@/pages/investments/InvestmentsPage";
import { GoalsPage } from "@/pages/goals/GoalsPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { TransactionsPage } from "@/pages/transactions/TransactionsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
        <Route
          path="/transacoes"
          element={
            <AppLayout>
              <TransactionsPage />
            </AppLayout>
          }
        />
        <Route
          path="/salario"
          element={
            <AppLayout>
              <SalaryPage />
            </AppLayout>
          }
        />
        <Route
          path="/cartoes"
          element={
            <AppLayout>
              <CardsPage />
            </AppLayout>
          }
        />
        <Route
          path="/investimentos"
          element={
            <AppLayout>
              <InvestmentsPage />
            </AppLayout>
          }
        />
        <Route
          path="/metas"
          element={
            <AppLayout>
              <GoalsPage />
            </AppLayout>
          }
        />
        <Route
          path="/relatorios"
          element={
            <AppLayout>
              <ReportsPage />
            </AppLayout>
          }
        />
      </Route>
      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}