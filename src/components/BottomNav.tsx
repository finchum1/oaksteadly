import { NavLink } from "react-router-dom";
import { CircleUser, Receipt, Target, TrendingDown } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

const NAV_ITEMS = [
  { to: "/", label: "Debts", icon: TrendingDown, end: true },
  { to: "/bills", label: "Bills", icon: Receipt, end: false },
  { to: "/goals", label: "Goals", icon: Target, end: false },
  { to: "/account", label: "Account", icon: CircleUser, end: false },
];

export function BottomNav() {
  const { colors } = useTheme();

  return (
    <nav
      className="flex md:hidden"
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        justifyContent: "space-around",
        background: colors.headerBg,
        backdropFilter: "blur(8px)",
        borderTop: `1px solid ${colors.border}`,
        paddingTop: 6,
        paddingBottom: "max(6px, env(safe-area-inset-bottom))",
      }}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="transition-colors duration-150 active:scale-90"
          style={({ isActive }) => ({
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "4px 10px",
            color: isActive ? colors.accent : colors.textMuted,
            textDecoration: "none",
          })}
        >
          <Icon size={22} />
          <span style={{ fontSize: 10.5, fontWeight: 600 }}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
