import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../hooks/useTheme";

const CATEGORIES = ["Faith", "Family", "Friends", "Finances", "Fitness", "Fun", "Future"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<Category, string> = {
  Faith: "#a855f7",
  Family: "#3b82f6",
  Friends: "#f59e0b",
  Finances: "#22c55e",
  Fitness: "#ec4899",
  Fun: "#38bdf8",
  Future: "#6366f1",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Goal {
  id: string;
  text: string;
}

type MonthGoals = Record<Category, Goal[]>;
type GoalsByMonth = Record<string, MonthGoals>;

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function emptyMonthGoals(): MonthGoals {
  return CATEGORIES.reduce((acc, c) => {
    acc[c] = [];
    return acc;
  }, {} as MonthGoals);
}

export default function GoalsTracker() {
  const { colors } = useTheme();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [goalsByMonth, setGoalsByMonth] = useState<GoalsByMonth>({});
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const mk = monthKey(year, month);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const monthGoals = goalsByMonth[mk] ?? emptyMonthGoals();

  // Shared with a partner account (see couple_sharing.sql): whichever row RLS
  // lets us see belongs to whoever created it first, not necessarily the
  // signed-in viewer, so we remember its real owner and keep writing to that
  // same row instead of splitting into two separate rows.
  const ownerIdRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    const { data, error } = await supabase.from("goals_tracker").select("user_id, data").limit(1).maybeSingle();
    if (!error && data) {
      ownerIdRef.current = data.user_id;
      setGoalsByMonth(data.data?.goalsByMonth ?? {});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setLoaded(true);
          return;
        }
        await loadData();
      } catch {
        // no saved data yet
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  // Cross-person sync: pick up a partner's edits without a manual reload.
  useEffect(() => {
    const channel = supabase
      .channel("goals-tracker-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "goals_tracker" }, () => loadData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  async function persist(next: GoalsByMonth) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveError(true);
        return;
      }
      const targetId = ownerIdRef.current ?? user.id;
      const { error } = await supabase
        .from("goals_tracker")
        .upsert(
          { user_id: targetId, data: { goalsByMonth: next }, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (!error) ownerIdRef.current = targetId;
      setSaveError(!!error);
    } catch {
      setSaveError(true);
    }
  }

  function addGoal(category: Category, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const goal: Goal = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: trimmed };
    const nextMonthGoals: MonthGoals = { ...monthGoals, [category]: [...monthGoals[category], goal] };
    const next = { ...goalsByMonth, [mk]: nextMonthGoals };
    setGoalsByMonth(next);
    persist(next);
  }

  function deleteGoal(category: Category, id: string) {
    const nextMonthGoals: MonthGoals = { ...monthGoals, [category]: monthGoals[category].filter((g) => g.id !== id) };
    const next = { ...goalsByMonth, [mk]: nextMonthGoals };
    setGoalsByMonth(next);
    persist(next);
  }

  function changeMonth(delta: number) {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  if (!loaded) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "3rem 1rem",
          textAlign: "center",
          color: colors.textMuted,
        }}
      >
        <div className="spinner" />
        <span style={{ fontSize: 13 }}>Loading your goals…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: "2.5rem 1.25rem 4rem" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="transition-opacity duration-150 hover:opacity-60 active:scale-90"
            style={{ padding: 8, borderRadius: 999, border: "none", background: "transparent", color: colors.textMuted, cursor: "pointer" }}
          >
            <ChevronLeft size={22} />
          </button>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              {MONTH_NAMES[month]} <span style={{ fontWeight: 400, color: colors.textMuted }}>{year}</span>
            </h1>
            {isCurrentMonth && (
              <div style={{ fontSize: 12, color: colors.green, marginTop: 4, fontWeight: 600 }}>● current month</div>
            )}
          </div>
          <button
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="transition-opacity duration-150 hover:opacity-60 active:scale-90"
            style={{ padding: 8, borderRadius: 999, border: "none", background: "transparent", color: colors.textMuted, cursor: "pointer" }}
          >
            <ChevronRight size={22} />
          </button>
        </div>

        <p style={{ textAlign: "center", color: colors.textMuted2, fontSize: 14, margin: "0 0 32px" }}>
          Goals reset each month — write down what matters for {MONTH_NAMES[month]}.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {CATEGORIES.map((category) => (
            <GoalBox
              key={category}
              category={category}
              goals={monthGoals[category] ?? []}
              onAdd={(text) => addGoal(category, text)}
              onDelete={(id) => deleteGoal(category, id)}
            />
          ))}
        </div>

        {saveError && (
          <div style={{ marginTop: 24, fontSize: 13, color: colors.red, textAlign: "center" }}>
            Changes couldn't be saved — check your connection and try again.
          </div>
        )}
      </div>
    </div>
  );
}

function GoalBox({
  category,
  goals,
  onAdd,
  onDelete,
}: {
  category: Category;
  goals: Goal[];
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  const color = CATEGORY_COLORS[category];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onAdd(draft);
    setDraft("");
  }

  return (
    <div
      className="transition-shadow duration-200"
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderTop: `2px solid ${color}`,
        borderRadius: 16,
        padding: "18px 20px 20px",
        display: "flex",
        flexDirection: "column",
        boxShadow: colors.shadow,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = colors.shadowHover)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = colors.shadow)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: color, display: "inline-block" }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{category}</h2>
      </div>

      {goals.length === 0 ? (
        <p style={{ fontSize: 13, color: colors.textMuted2, fontStyle: "italic", margin: "0 0 12px" }}>
          No goals yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {goals.map((goal) => (
            <div
              key={goal.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
                padding: "6px 10px",
                background: colors.surfaceAlt,
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 13.5, color: colors.text, lineHeight: 1.4 }}>{goal.text}</span>
              <button
                onClick={() => onDelete(goal.id)}
                title="Delete goal"
                className="transition-colors duration-150 active:scale-90"
                style={{ background: "none", border: "none", color: colors.textMuted2, cursor: "pointer", fontSize: 15, lineHeight: 1, flexShrink: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = colors.red)}
                onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted2)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 6, marginTop: "auto" }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a goal…"
          style={{
            flex: 1,
            minWidth: 0,
            background: colors.surfaceAlt,
            border: `1px solid ${colors.borderInput}`,
            borderRadius: 8,
            color: colors.text,
            fontSize: 13,
            padding: "7px 10px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          aria-label={`Add goal to ${category}`}
          className="transition-transform duration-150 hover:brightness-110 active:scale-90"
          style={{
            background: color,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            width: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
}
