import { Moon, RefreshCw, Sun, Users } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../hooks/useTheme";
import { COUPLE_EMAILS, COUPLE_PEOPLE, isCoupleMember } from "../lib/coupleAccess";

export function AccountPage({ session }: { session: Session }) {
  const { mode, colors, toggleTheme } = useTheme();
  const email = session.user.email ?? null;
  const shared = isCoupleMember(email);
  const partnerEmail = COUPLE_EMAILS.find((e) => e.toLowerCase() !== email?.toLowerCase());
  const partnerName = partnerEmail ? COUPLE_PEOPLE[partnerEmail.toLowerCase()] ?? partnerEmail : null;

  const cardStyle = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 16,
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: "2.5rem 1.25rem 2rem" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 11, color: colors.accent, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Oaksteadly
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Account</h1>

        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: colors.textMuted2, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Signed in as
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, wordBreak: "break-all" }}>{email}</div>
        </div>

        {shared && partnerName && (
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Users size={16} color={colors.accent} />
              <span style={{ fontSize: 11, color: colors.textMuted2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Shared with
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{partnerName}</div>
            <p style={{ fontSize: 13, color: colors.textMuted2, lineHeight: 1.5, margin: "0 0 10px" }}>
              Debts, Bills, Goals, and Letters are shared between the two of you — either of you can edit
              anything, and changes appear on the other's device in real time.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={13} color={colors.green} />
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.green }}>Live sync active</span>
            </div>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="transition-colors duration-150 active:scale-[0.98]"
          style={{
            ...cardStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 600 }}>
            {mode === "dark" ? <Moon size={18} color={colors.textMuted3} /> : <Sun size={18} color={colors.textMuted3} />}
            Dark mode
          </span>
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 24,
              borderRadius: 99,
              background: mode === "dark" ? colors.accent : colors.borderInput,
              position: "relative",
              transition: "background 0.15s ease",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: mode === "dark" ? 18 : 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.15s ease",
              }}
            />
          </span>
        </button>

        <button
          onClick={() => supabase.auth.signOut()}
          className="transition-colors duration-150 active:scale-[0.98]"
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: "12px 16px",
            background: "none",
            color: colors.red,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
