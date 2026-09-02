import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Mail, Send, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../hooks/useTheme";
import { COUPLE_PEOPLE, isCoupleMember } from "../lib/coupleAccess";

interface Letter {
  id: string;
  author_id: string;
  author_email: string;
  body: string;
  created_at: string;
}

function displayName(email: string, viewerEmail: string | null) {
  if (viewerEmail && email.toLowerCase() === viewerEmail.toLowerCase()) return "You";
  return COUPLE_PEOPLE[email.toLowerCase()] ?? email;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

export default function LettersTracker() {
  const { colors } = useTheme();
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const { data, error: fetchError } = await supabase
      .from("letters")
      .select("*")
      .order("created_at", { ascending: true });
    if (!fetchError && data) setLetters(data as Letter[]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) {
        setViewerEmail(user?.email ?? null);
        setViewerId(user?.id ?? null);
      }
      if (isCoupleMember(user?.email)) {
        await refresh();
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cross-device (and cross-person) sync: a letter written on one side shows
  // up for the other without a manual refresh.
  useEffect(() => {
    const channel = supabase
      .channel("letters-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "letters" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [letters.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !viewerId || !viewerEmail) return;
    setSending(true);
    setError(null);
    const { error: insertError } = await supabase.from("letters").insert({
      author_id: viewerId,
      author_email: viewerEmail,
      body: trimmed,
    });
    setSending(false);
    if (insertError) {
      setError("Couldn't send — check your connection and try again.");
      return;
    }
    setDraft("");
    await refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("letters").delete().eq("id", id);
    await refresh();
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
        <span style={{ fontSize: 13 }}>Loading your letters…</span>
      </div>
    );
  }

  if (!isCoupleMember(viewerEmail)) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
          color: colors.text,
        }}
      >
        <Mail size={28} style={{ color: colors.textMuted2, marginBottom: 12 }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Letters isn't available on this account</h1>
        <p style={{ color: colors.textMuted2, fontSize: 14, maxWidth: 360, margin: 0 }}>
          This module is a private space shared between two specific accounts only.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: "2.5rem 1.25rem 3rem" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Letters</h1>
          <p style={{ color: colors.textMuted2, fontSize: 14, margin: 0 }}>A private space just for the two of you.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {letters.length === 0 ? (
            <p style={{ textAlign: "center", color: colors.textMuted2, fontSize: 14, fontStyle: "italic" }}>
              No letters yet — write the first one below.
            </p>
          ) : (
            letters.map((letter) => {
              const mine = letter.author_id === viewerId;
              return (
                <div key={letter.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div
                    className="group transition-shadow duration-200"
                    style={{
                      maxWidth: "85%",
                      background: mine ? colors.accent : colors.surface,
                      color: mine ? "#fff" : colors.text,
                      border: mine ? "none" : `1px solid ${colors.border}`,
                      borderRadius: 16,
                      padding: "14px 16px",
                      boxShadow: colors.shadow,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>
                        {displayName(letter.author_email, viewerEmail)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, opacity: 0.65 }}>{formatDate(letter.created_at)}</span>
                        {mine && (
                          <button
                            onClick={() => handleDelete(letter.id)}
                            aria-label="Delete letter"
                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-70 transition-opacity duration-150 active:scale-90"
                            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex", padding: 0 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{letter.body}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a letter…"
            rows={4}
            style={{
              resize: "vertical",
              background: colors.surface,
              border: `1px solid ${colors.borderInput}`,
              borderRadius: 12,
              color: colors.text,
              fontSize: 14.5,
              padding: "12px 14px",
              outline: "none",
              boxShadow: colors.shadow,
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            {error && <span style={{ color: colors.red, fontSize: 13 }}>{error}</span>}
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className={sending ? "" : "transition-transform duration-150 hover:brightness-110 active:scale-[0.97]"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: colors.accent,
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                padding: "10px 18px",
                cursor: sending || !draft.trim() ? "default" : "pointer",
                opacity: sending || !draft.trim() ? 0.6 : 1,
              }}
            >
              <Send size={14} />
              {sending ? "Sending…" : "Send letter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
