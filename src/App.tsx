import { useMemo, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useAccounts } from "./hooks/useAccounts";
import { useTheme } from "./hooks/useTheme";
import { Sidebar } from "./components/Sidebar";
import { AuthModal } from "./components/AuthModal";
import { GroupSection } from "./components/GroupSection";
import { ChangeChip } from "./components/ChangeChip";
import { Landing } from "./components/Landing";
import BillTracker from "./components/BillTracker.jsx";
import GoalsTracker from "./components/GoalsTracker";
import LettersTracker from "./components/LettersTracker";
import { GROUPS, GROUP_COLORS } from "./types";
import { formatCurrency, getCurrentBalance, pct } from "./lib/debt";

function Dashboard({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const { accounts, loading, addAccount, updateAccount, deleteAccount, addEntry, deleteEntry } =
    useAccounts(userId);

  const totals = useMemo(() => {
    const totalStart = accounts.reduce(
      (sum, a) => (a.starting_balance !== null ? sum + Number(a.starting_balance) : sum),
      0
    );
    const totalCurrent = accounts.reduce((sum, a) => {
      const cur = getCurrentBalance(a);
      return cur !== null ? sum + cur : sum;
    }, 0);
    const totalPaid = totalStart - totalCurrent;
    const totalPct = totalStart > 0 ? pct(totalCurrent, totalStart) : null;
    const totalMonthly = accounts.reduce(
      (sum, a) => (a.monthly_payment !== null ? sum + Number(a.monthly_payment) : sum),
      0
    );

    const aprWeightedSum = accounts.reduce((sum, a) => {
      const cur = getCurrentBalance(a);
      if (cur !== null && a.apr !== null) return sum + cur * Number(a.apr);
      return sum;
    }, 0);
    const aprWeightBase = accounts.reduce((sum, a) => {
      const cur = getCurrentBalance(a);
      return cur !== null && a.apr !== null ? sum + cur : sum;
    }, 0);
    const avgApr = aprWeightBase > 0 ? aprWeightedSum / aprWeightBase : null;

    return { totalStart, totalCurrent, totalPaid, totalPct, totalMonthly, avgApr };
  }, [accounts]);

  const emptyGroups = GROUPS.filter((g) => accounts.filter((a) => a.category === g).length === 0);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          color: colors.textMuted,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: "'Outfit', -apple-system, sans-serif",
        }}
      >
        <div className="spinner" />
        <span style={{ fontSize: 13 }}>Loading your accounts…</span>
      </div>
    );
  }

  const statCards: { label: string; value: string; color: string; big?: boolean }[] = [
    { label: "Starting Grand Total", value: formatCurrency(totals.totalStart), color: colors.textMuted3 },
    { label: "Current Total Balance", value: formatCurrency(totals.totalCurrent), color: colors.text, big: true },
    {
      label: "Total Paid Off",
      value: formatCurrency(totals.totalPaid),
      color: totals.totalPaid >= 0 ? colors.green : colors.red,
    },
    { label: "Total Monthly Payments", value: formatCurrency(totals.totalMonthly), color: colors.sky },
  ];
  if (totals.avgApr !== null) {
    statCards.push({
      label: "Avg APR (weighted)",
      value: `${totals.avgApr.toFixed(2)}%`,
      color: totals.avgApr >= 20 ? colors.redSoft : colors.text,
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        fontFamily: "'Outfit', -apple-system, sans-serif",
        color: colors.text,
        padding: "0 0 60px",
      }}
    >
      <div
        style={{
          background: `linear-gradient(180deg, ${colors.surface} 0%, ${colors.bg} 100%)`,
          borderBottom: `1px solid ${colors.border}`,
          padding: "32px 24px 24px",
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: colors.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
            Oaksteadly
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, marginBottom: 4 }}>
            Total Debt Dashboard
          </h1>
          <p style={{ color: colors.textMuted2, fontSize: 14, margin: 0 }}>Track balances by category. Green means progress.</p>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {statCards.map(({ label, value, color, big }) => (
            <div
              key={label}
              style={{
                background: colors.surface,
                border: big ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: "12px 18px",
                minWidth: 160,
              }}
            >
              <div style={{ fontSize: 11, color: colors.textMuted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                {value}
              </div>
            </div>
          ))}
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: "12px 18px",
              minWidth: 130,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 11, color: colors.textMuted2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Overall Change
            </div>
            {totals.totalPct !== null ? (
              <ChangeChip value={totals.totalPct} />
            ) : (
              <span style={{ color: colors.borderInput, fontSize: 13 }}>Enter starting balances</span>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {GROUPS.map((g) => {
            const groupAccounts = accounts.filter((a) => a.category === g);
            if (groupAccounts.length === 0) return null;
            const gTotal = groupAccounts.reduce((sum, a) => {
              const cur = getCurrentBalance(a);
              return cur !== null ? sum + cur : sum;
            }, 0);
            const color = GROUP_COLORS[g];
            return (
              <div
                key={g}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: colors.surface,
                  border: `1px solid ${color}40`,
                  borderRadius: 99,
                  padding: "5px 12px 5px 8px",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 99, background: color }} />
                <span style={{ fontSize: 12, color: colors.textMuted3 }}>{g}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{formatCurrency(gTotal)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px 0" }}>
        {GROUPS.map((group) => (
          <GroupSection
            key={group}
            group={group}
            accounts={accounts.filter((a) => a.category === group)}
            onUpdate={updateAccount}
            onDelete={deleteAccount}
            onAddEntry={addEntry}
            onDeleteEntry={deleteEntry}
            onAddAccount={addAccount}
          />
        ))}

        {emptyGroups.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            {emptyGroups.map((g) => (
              <button
                key={g}
                onClick={() => addAccount(g)}
                className="transition-colors duration-150 active:scale-[0.97]"
                style={{
                  background: "none",
                  border: `2px dashed ${GROUP_COLORS[g]}40`,
                  borderRadius: 12,
                  color: GROUP_COLORS[g],
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "10px 16px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${GROUP_COLORS[g]}80`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${GROUP_COLORS[g]}40`)}
              >
                + Start {g} group
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotFound() {
  const { colors } = useTheme();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: colors.text,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 13, color: colors.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
        404
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Page not found</h1>
      <p style={{ color: colors.textMuted2, fontSize: 14, margin: "0 0 24px" }}>
        That page doesn't exist. Head back to your dashboard.
      </p>
      <Link
        to="/"
        className="transition-transform duration-150 hover:brightness-110 active:scale-[0.97]"
        style={{
          background: colors.accent,
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          padding: "10px 20px",
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Back to Oaksteadly
      </Link>
    </div>
  );
}

function App() {
  const { colors } = useTheme();
  const { session, loading } = useAuth();
  const [authModal, setAuthModal] = useState<"signin" | "signup" | null>(null);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          color: colors.textMuted,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: "'Outfit', -apple-system, sans-serif",
        }}
      >
        <div className="spinner" />
        <span style={{ fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: "100vh", background: colors.bg }}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar session={session} onLogin={() => setAuthModal("signin")} onSignup={() => setAuthModal("signup")} />
      <main id="main-content" className="flex-1" style={{ minWidth: 0 }}>
        <Routes>
          <Route
            path="/"
            element={
              session ? <Dashboard userId={session.user.id} /> : <Landing onGetStarted={() => setAuthModal("signup")} />
            }
          />
          <Route path="/bills" element={session ? <BillTracker /> : <Navigate to="/" replace />} />
          <Route path="/goals" element={session ? <GoalsTracker /> : <Navigate to="/" replace />} />
          <Route path="/letters" element={session ? <LettersTracker /> : <Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}
    </div>
  );
}

export default App;
