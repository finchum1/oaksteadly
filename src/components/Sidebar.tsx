import { useState } from "react";
import type { MouseEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { NavLink } from "react-router-dom";
import { Mail, Menu, Moon, Receipt, Sun, Target, TrendingDown, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../hooks/useTheme";
import { isLettersAllowed } from "../lib/lettersAccess";

interface SidebarProps {
  session: Session | null;
  onLogin: () => void;
  onSignup: () => void;
}

const NAV_ITEMS = [
  { to: "/", label: "Debts", icon: TrendingDown, end: true },
  { to: "/bills", label: "Bills", icon: Receipt, end: false },
  { to: "/goals", label: "Goals", icon: Target, end: false },
];

export function Sidebar({ session, onLogin, onSignup }: SidebarProps) {
  const { mode, colors, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showLetters = isLettersAllowed(session?.user.email);

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    fontWeight: 600 as const,
    color: isActive ? colors.text : colors.textMuted,
    textDecoration: "none",
    padding: "9px 12px",
    borderRadius: 8,
    background: isActive ? colors.surfaceAlt : "transparent",
    transition: "background 0.15s ease, color 0.15s ease",
  });

  function navLinkHover(e: MouseEvent<HTMLAnchorElement>, entering: boolean) {
    if (e.currentTarget.getAttribute("aria-current") === "page") return;
    e.currentTarget.style.background = entering ? colors.surfaceAlt : "transparent";
  }

  const buttonBase = {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    color: colors.textMuted3,
    fontSize: 13,
    fontWeight: 600 as const,
    padding: "9px 12px",
    cursor: "pointer" as const,
  };

  const navContent = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: colors.text, letterSpacing: "-0.02em" }}>
          Oaksteadly
        </span>
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="md:hidden inline-flex"
          style={{ background: "none", border: "none", color: colors.textMuted3, cursor: "pointer", padding: 4 }}
        >
          <X size={20} />
        </button>
      </div>

      {session && (
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 24 }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={navLinkStyle}
              onMouseEnter={(e) => navLinkHover(e, true)}
              onMouseLeave={(e) => navLinkHover(e, false)}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
          {showLetters && (
            <NavLink
              to="/letters"
              style={navLinkStyle}
              onMouseEnter={(e) => navLinkHover(e, true)}
              onMouseLeave={(e) => navLinkHover(e, false)}
              onClick={() => setMobileOpen(false)}
            >
              <Mail size={16} />
              Letters
            </NavLink>
          )}
        </nav>
      )}

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={toggleTheme}
          title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="transition-colors duration-150 active:scale-[0.94]"
          style={{ ...buttonBase, display: "flex", alignItems: "center", gap: 10 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.surfaceAlt;
            e.currentTarget.style.color = colors.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = colors.textMuted3;
          }}
        >
          {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {mode === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {session ? (
          <>
            <div style={{ fontSize: 12.5, color: colors.textMuted, padding: "0 2px", wordBreak: "break-all" }}>
              {session.user.email}
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="transition-colors duration-150 active:scale-[0.97]"
              style={buttonBase}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.surfaceAlt)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onLogin}
              className="transition-colors duration-150 active:scale-[0.97]"
              style={buttonBase}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.surfaceAlt)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              Log in
            </button>
            <button
              onClick={onSignup}
              className="transition-transform duration-150 hover:brightness-110 active:scale-[0.97]"
              style={{
                background: colors.accent,
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                padding: "9px 12px",
                cursor: "pointer",
              }}
            >
              Sign up
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar — replaces the full-height sidebar below 768px */}
      <div
        className="flex md:hidden"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: colors.headerBg,
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 800, color: colors.text, letterSpacing: "-0.02em" }}>
          Oaksteadly
        </span>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          style={{
            background: "none",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            color: colors.textMuted3,
            cursor: "pointer",
            padding: 6,
            display: "flex",
          }}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Mobile slide-in drawer */}
      {mobileOpen && (
        <div
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(2, 8, 23, 0.6)", zIndex: 40 }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 260,
              maxWidth: "80vw",
              height: "100vh",
              background: colors.surface,
              borderRight: `1px solid ${colors.border}`,
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              boxShadow: colors.shadowHover,
            }}
          >
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop full-height sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          width: 232,
          flexShrink: 0,
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          flexDirection: "column",
          background: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          padding: "24px 18px",
        }}
      >
        {navContent}
      </aside>
    </>
  );
}
