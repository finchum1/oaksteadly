import { useState } from "react";
import type { Account, Group } from "../types";
import { GROUP_COLORS } from "../types";
import { formatCurrency, getCurrentBalance, pct } from "../lib/debt";
import { ChangeChip } from "./ChangeChip";
import { CardPanel } from "./CardPanel";
import { useTheme } from "../hooks/useTheme";

interface GroupSectionProps {
  group: Group;
  accounts: Account[];
  onUpdate: (id: string, patch: Partial<Account>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddEntry: (accountId: string, month: string, balance: number) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onAddAccount: (group: Group) => Promise<void>;
}

export function GroupSection({
  group,
  accounts,
  onUpdate,
  onDelete,
  onAddEntry,
  onDeleteEntry,
  onAddAccount,
}: GroupSectionProps) {
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const color = GROUP_COLORS[group];

  const groupStart = accounts.reduce(
    (sum, a) => (a.starting_balance !== null ? sum + Number(a.starting_balance) : sum),
    0
  );
  const groupCurrent = accounts.reduce((sum, a) => {
    const cur = getCurrentBalance(a);
    return cur !== null ? sum + cur : sum;
  }, 0);
  const groupMonthly = accounts.reduce(
    (sum, a) => (a.monthly_payment !== null ? sum + Number(a.monthly_payment) : sum),
    0
  );
  const groupPct = groupStart > 0 ? pct(groupCurrent, groupStart) : null;

  if (accounts.length === 0) return null;

  return (
    <section aria-label={`${group} accounts`} style={{ marginBottom: 28 }}>
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          rowGap: 6,
          cursor: "pointer",
          paddingBottom: 10,
          marginBottom: 14,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", rowGap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: color, display: "inline-block" }} />
          <h2 style={{ fontSize: 16, fontWeight: 800, color: colors.text, margin: 0, letterSpacing: "-0.01em" }}>
            {group}
          </h2>
          <span style={{ fontSize: 12, color: colors.textMuted2 }}>
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", rowGap: 4 }}>
          {groupMonthly > 0 && (
            <span style={{ fontSize: 12, color: colors.textMuted }}>
              {formatCurrency(groupMonthly)}
              <span style={{ color: colors.borderInput }}>/mo</span>
            </span>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.text, fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(groupCurrent)}
          </span>
          {groupPct !== null && <ChangeChip value={groupPct} />}
          <span style={{ color: colors.textMuted2, fontSize: 12 }}>{collapsed ? "▶" : "▼"}</span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {accounts.map((account) => (
            <CardPanel
              key={account.id}
              account={account}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddEntry={onAddEntry}
              onDeleteEntry={onDeleteEntry}
            />
          ))}
          <button
            onClick={() => onAddAccount(group)}
            className="transition-colors duration-150 active:scale-[0.98]"
            style={{
              background: "none",
              border: `2px dashed ${color}40`,
              borderRadius: 16,
              color,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 100,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${color}80`)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${color}40`)}
          >
            + Add {group} Account
          </button>
        </div>
      )}
    </section>
  );
}
