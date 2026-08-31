import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Trash2, Check, X } from 'lucide-react';
// Adjust this import to wherever your project creates its Supabase client, e.g.:
//   export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../hooks/useTheme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_ABBR = MONTH_NAMES.map((m) => m.slice(0, 3));
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Fonts match the rest of the app; colors come from useTheme() (see below) so this
// page follows the same light/dark toggle instead of having its own separate palette.
const MONO = "'Outfit', -apple-system, sans-serif";
const SERIF = "'Outfit', -apple-system, sans-serif";

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function effectiveDueDay(bill, year, month) {
  return Math.min(bill.dueDay, daysInMonth(year, month));
}
function billAppliesToMonth(bill, year, month) {
  if (bill.recurring === false) return bill.year === year && bill.month === month;
  return true;
}
function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
function isDone(status) {
  return !!(status && status.paid && status.cleared);
}

function renderNotes(text, onToggleCheckbox, colors) {
  const { text: INK, textMuted: MUTED, green: SAGE } = colors;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed === '') return <div key={idx} style={{ height: 8 }} />;
    if (trimmed.startsWith('# ')) {
      return (
        <div key={idx} style={{ fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 600, margin: '6px 0 4px', color: INK }}>
          {trimmed.slice(2)}
        </div>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <div key={idx} style={{ fontFamily: SERIF, fontSize: '1.02rem', fontWeight: 600, margin: '5px 0 3px', color: INK }}>
          {trimmed.slice(3)}
        </div>
      );
    }
    const checkMatch = trimmed.match(/^-\s*\[( |x|X)\]\s*(.*)$/);
    if (checkMatch) {
      const checked = checkMatch[1].toLowerCase() === 'x';
      const label = checkMatch[2];
      return (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
          <StampCheck
            size={18}
            checked={checked}
            color={SAGE}
            label={checked ? `Mark "${label}" as not done` : `Mark "${label}" as done`}
            onClick={() => onToggleCheckbox(idx)}
          />
          <span style={{ fontSize: '0.9rem', textDecoration: checked ? 'line-through' : 'none', color: checked ? MUTED : INK }}>{label}</span>
        </div>
      );
    }
    if (trimmed.startsWith('- ')) {
      return (
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '2px 0' }}>
          <span style={{ color: MUTED }}>•</span>
          <span style={{ fontSize: '0.9rem' }}>{trimmed.slice(2)}</span>
        </div>
      );
    }
    return (
      <div key={idx} style={{ fontSize: '0.9rem', padding: '2px 0' }}>
        {line}
      </div>
    );
  });
}

function StampCheck({ checked, onClick, color, label, size = 30 }) {
  const { colors } = useTheme();
  const { text: INK, border: LINE } = colors;
  const iconSize = Math.round(size * 0.52);
  return (
    <button
      onClick={onClick}
      aria-pressed={checked}
      aria-label={label}
      style={{
        width: size,
        height: size,
        borderRadius: size > 20 ? 6 : 4,
        border: `1.5px solid ${checked ? color : LINE}`,
        background: checked ? color : 'transparent',
        color: checked ? INK : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: checked ? 'rotate(-6deg) scale(1.06)' : 'rotate(0deg) scale(1)',
        transition: 'transform 0.16s ease, background 0.16s ease, border-color 0.16s ease',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0
      }}
    >
      <Check size={iconSize} strokeWidth={3} />
    </button>
  );
}

function BillNoteField({ bill, onUpdateNote }) {
  const { colors } = useTheme();
  const { border: LINE, textMuted: MUTED } = colors;
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(bill.note || '');

  if (!onUpdateNote) return null;

  function saveNote() {
    setEditingNote(false);
    const trimmed = noteDraft.trim();
    if (trimmed !== (bill.note || '')) onUpdateNote(trimmed);
  }

  if (editingNote) {
    return (
      <input
        autoFocus
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        onBlur={saveNote}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); saveNote(); }
          if (e.key === 'Escape') { setNoteDraft(bill.note || ''); setEditingNote(false); }
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder="e.g. Autopay from Checking"
        style={{
          display: 'block',
          marginTop: 3,
          width: '90%',
          fontSize: '0.75rem',
          fontFamily: MONO,
          color: MUTED,
          background: 'transparent',
          border: `1px solid ${LINE}`,
          borderRadius: 4,
          padding: '2px 6px',
          boxSizing: 'border-box'
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setNoteDraft(bill.note || ''); setEditingNote(true); }}
      className={bill.note ? '' : 'opacity-0 group-hover:opacity-100'}
      style={{
        display: 'block',
        marginTop: 3,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontFamily: MONO,
        color: MUTED,
        fontStyle: bill.note ? 'normal' : 'italic',
        transition: 'opacity 0.15s'
      }}
    >
      {bill.note || '+ add note'}
    </button>
  );
}

function ListRow({ bill, status, displayDay, overdue, dimmed, onTogglePaid, onToggleCleared, onDelete, onUpdateNote }) {
  const { colors } = useTheme();
  const { text: INK, border: LINE, textMuted: MUTED, red: RUST, amber: AMBER, green: SAGE } = colors;

  return (
    <div className="group flex items-center" style={{ padding: '10px 0', borderBottom: `1px solid ${LINE}`, opacity: dimmed ? 0.55 : 1 }}>
      <div style={{ width: 40, fontFamily: MONO, fontSize: '0.85rem', fontWeight: 500, color: overdue ? RUST : INK }}>
        {String(displayDay).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, fontSize: '0.95rem', paddingRight: 8, color: dimmed ? MUTED : INK, textDecoration: dimmed ? 'line-through' : 'none' }}>
        {bill.name}
        {bill.recurring === false && (
          <span style={{ fontSize: '0.65rem', color: MUTED, marginLeft: 8, fontFamily: MONO, border: `1px solid ${LINE}`, borderRadius: 4, padding: '1px 5px' }}>
            one-time
          </span>
        )}
        {overdue && !dimmed && <span style={{ fontSize: '0.7rem', color: RUST, marginLeft: 8, fontFamily: MONO }}>past due</span>}
        <BillNoteField bill={bill} onUpdateNote={onUpdateNote} />
      </div>
      <div style={{ width: 90, textAlign: 'right', fontFamily: MONO, fontSize: '0.9rem', color: dimmed ? MUTED : INK }}>${fmt(bill.amount)}</div>
      <div style={{ width: 30, marginLeft: 16, display: 'flex', justifyContent: 'center' }}>
        <StampCheck checked={status.paid} color={AMBER} label={`Mark ${bill.name} as paid`} onClick={onTogglePaid} />
      </div>
      <div style={{ width: 30, marginLeft: 8, display: 'flex', justifyContent: 'center' }}>
        <StampCheck checked={status.cleared} color={SAGE} label={`Mark ${bill.name} as cleared the bank`} onClick={onToggleCleared} />
      </div>
      <button
        onClick={onDelete}
        aria-label={`Delete ${bill.name}`}
        className="opacity-0 group-hover:opacity-100"
        style={{ width: 28, marginLeft: 20, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', transition: 'opacity 0.15s' }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function CollapsibleDone({ count, open, onToggle, children }) {
  const { colors } = useTheme();
  const { border: LINE, green: SAGE } = colors;
  if (count === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 2px',
          background: 'transparent',
          border: 'none',
          borderTop: `1px solid ${LINE}`,
          cursor: 'pointer',
          color: SAGE,
          fontSize: '0.78rem',
          fontFamily: MONO
        }}
      >
        <span>paid & cleared ({count})</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export default function BillTracker() {
  const { colors } = useTheme();
  const INK = colors.text;
  const PAPER = colors.bg;
  const SURFACE = colors.surfaceAlt;
  const ACCENT = colors.accent;
  const LINE = colors.border;
  const MUTED = colors.textMuted;
  const SAGE = colors.green;
  const AMBER = colors.amber;
  const RUST = colors.red;
  const today = new Date();
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [currentDate, setCurrentDate] = useState(todayZero);
  const [view, setView] = useState('list');
  const [bills, setBills] = useState([]);
  const [statusesByMonth, setStatusesByMonth] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', dueDay: '1', note: '' });
  const [formError, setFormError] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '', dueDay: '1', note: '' });
  const [expenseFormError, setExpenseFormError] = useState('');
  const [showDoneExpenses, setShowDoneExpenses] = useState(false);
  const [showDoneList, setShowDoneList] = useState(false);
  const [showDoneMonth, setShowDoneMonth] = useState(false);
  const [showDoneWeek, setShowDoneWeek] = useState(false);
  const [notesByMonth, setNotesByMonth] = useState({});
  const [notesEditing, setNotesEditing] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const notesTextareaRef = useRef(null);

  // Shared with a partner account (see couple_sharing.sql): whichever row RLS
  // lets us see belongs to whoever created it first, not necessarily the
  // signed-in viewer, so we remember its real owner and keep writing to that
  // same row instead of splitting into two separate rows.
  const ownerIdRef = useRef(null);

  const loadData = useCallback(async () => {
    const { data, error } = await supabase
      .from('bill_tracker')
      .select('user_id, data')
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      ownerIdRef.current = data.user_id;
      const parsed = data.data || {};
      setBills(parsed.bills || []);
      setStatusesByMonth(parsed.statusesByMonth || {});
      let nbm = parsed.notesByMonth || {};
      if (parsed.notes && !parsed.notesByMonth) {
        const legacyKey = monthKey(today.getFullYear(), today.getMonth());
        nbm = { ...nbm, [legacyKey]: parsed.notes };
      }
      setNotesByMonth(nbm);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) setLoaded(true); return; }
        await loadData();
      } catch (e) {
        // no saved data yet
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [loadData]);

  // Cross-person sync: pick up a partner's edits without a manual reload.
  useEffect(() => {
    const channel = supabase
      .channel('bill-tracker-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_tracker' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const persist = useCallback(async (nextBills, nextStatuses, nextNotesByMonth) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaveError(true); return; }
      const targetId = ownerIdRef.current ?? user.id;
      const { error } = await supabase
        .from('bill_tracker')
        .upsert(
          {
            user_id: targetId,
            data: { bills: nextBills, statusesByMonth: nextStatuses, notesByMonth: nextNotesByMonth },
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      if (!error) ownerIdRef.current = targetId;
      setSaveError(!!error);
    } catch (e) {
      setSaveError(true);
    }
  }, []);

  function addBill() {
    const amount = parseFloat(form.amount);
    const dueDay = Math.min(31, Math.max(1, parseInt(form.dueDay, 10) || 1));
    if (!form.name.trim() || isNaN(amount) || amount <= 0) {
      setFormError('Enter a bill name and an amount greater than 0.');
      return;
    }
    const newBill = { id: Date.now().toString(36), name: form.name.trim(), amount, dueDay, note: form.note.trim() };
    const nextBills = [...bills, newBill];
    setBills(nextBills);
    persist(nextBills, statusesByMonth, notesByMonth);
    setForm({ name: '', amount: '', dueDay: '1', note: '' });
    setFormError('');
    setShowForm(false);
  }

  function addExpense() {
    const amount = parseFloat(expenseForm.amount);
    const dueDay = Math.min(31, Math.max(1, parseInt(expenseForm.dueDay, 10) || 1));
    if (!expenseForm.name.trim() || isNaN(amount) || amount <= 0) {
      setExpenseFormError('Enter a name and an amount greater than 0.');
      return;
    }
    const newExpense = {
      id: Date.now().toString(36),
      name: expenseForm.name.trim(),
      amount,
      dueDay,
      recurring: false,
      year,
      month,
      note: expenseForm.note.trim()
    };
    const nextBills = [...bills, newExpense];
    setBills(nextBills);
    persist(nextBills, statusesByMonth, notesByMonth);
    setExpenseForm({ name: '', amount: '', dueDay: '1', note: '' });
    setExpenseFormError('');
    setShowExpenseForm(false);
  }

  function deleteBill(id) {
    const nextBills = bills.filter((b) => b.id !== id);
    setBills(nextBills);
    persist(nextBills, statusesByMonth, notesByMonth);
  }

  function updateBillNote(id, note) {
    const nextBills = bills.map((b) => (b.id === id ? { ...b, note } : b));
    setBills(nextBills);
    persist(nextBills, statusesByMonth, notesByMonth);
  }

  function toggleStatus(billId, field, y, m) {
    const mk = monthKey(y, m);
    const monthStatuses = { ...(statusesByMonth[mk] || {}) };
    const current = monthStatuses[billId] || { paid: false, cleared: false };
    const updated = { ...current, [field]: !current[field] };
    if (field === 'paid' && !updated.paid) updated.cleared = false;
    monthStatuses[billId] = updated;
    const nextStatuses = { ...statusesByMonth, [mk]: monthStatuses };
    setStatusesByMonth(nextStatuses);
    persist(bills, nextStatuses, notesByMonth);
  }

  function saveNotes() {
    const nextNotesByMonth = { ...notesByMonth, [mk]: draftNotes };
    setNotesByMonth(nextNotesByMonth);
    persist(bills, statusesByMonth, nextNotesByMonth);
    setNotesEditing(false);
  }

  const NOTE_PREFIXES = ['- [ ] ', '- [x] ', '- [X] ', '## ', '# ', '- '];

  function applyNoteFormat(prefix) {
    const el = notesTextareaRef.current;
    const value = draftNotes;
    const pos = el ? el.selectionStart : value.length;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = value.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = value.length;
    const line = value.slice(lineStart, lineEnd);

    let stripped = line;
    let matchedPrefix = null;
    for (const p of NOTE_PREFIXES) {
      if (line.startsWith(p)) {
        stripped = line.slice(p.length);
        matchedPrefix = p;
        break;
      }
    }

    const samePrefix = matchedPrefix && matchedPrefix.trim().toLowerCase() === prefix.trim().toLowerCase();
    const newLine = samePrefix ? stripped : prefix + stripped;
    const newValue = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
    setDraftNotes(newValue);

    const newCursor = lineStart + newLine.length;
    requestAnimationFrame(() => {
      if (notesTextareaRef.current) {
        notesTextareaRef.current.focus();
        notesTextareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  }

  function toggleNoteCheckbox(lineIdx) {
    const currentNotes = notesByMonth[mk] || '';
    const lines = currentNotes.split('\n');
    const line = lines[lineIdx];
    if (!line) return;
    const match = line.match(/\[( |x|X)\]/);
    if (!match) return;
    const isChecked = match[1].toLowerCase() === 'x';
    lines[lineIdx] = line.replace(/\[( |x|X)\]/, isChecked ? '[ ]' : '[x]');
    const nextNotes = lines.join('\n');
    const nextNotesByMonth = { ...notesByMonth, [mk]: nextNotes };
    setNotesByMonth(nextNotesByMonth);
    persist(bills, statusesByMonth, nextNotesByMonth);
  }

  function changeMonth(delta) {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }
  function changeWeek(delta) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  if (!loaded) {
    return (
      <div style={{ fontFamily: "'Outfit', -apple-system, sans-serif", color: MUTED, padding: '3rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="spinner" />
        <span style={{ fontSize: 13 }}>Loading your bills…</span>
      </div>
    );
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const mk = monthKey(year, month);
  const monthStatuses = statusesByMonth[mk] || {};
  const dim = daysInMonth(year, month);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const monthBills = bills.filter((b) => billAppliesToMonth(b, year, month));
  const recurringMonthBills = monthBills.filter((b) => b.recurring !== false);
  const oneOffMonthBills = monthBills.filter((b) => b.recurring === false);
  const sortedBills = [...recurringMonthBills].sort((a, b) => a.dueDay - b.dueDay);
  const sortedExpenses = [...oneOffMonthBills].sort((a, b) => a.dueDay - b.dueDay);
  const allSortedMonthBills = [...monthBills].sort((a, b) => a.dueDay - b.dueDay);

  const totalDue = monthBills.reduce((s, b) => s + b.amount, 0);
  const remaining = monthBills.reduce((s, b) => s + (monthStatuses[b.id]?.paid ? 0 : b.amount), 0);
  const pendingClearance = monthBills.reduce((s, b) => {
    const st = monthStatuses[b.id];
    return s + (st?.paid && !st?.cleared ? b.amount : 0);
  }, 0);

  // Month grid cells
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const totalCells = Math.ceil((startWeekday + dim) / 7) * 7;
  const gridCells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    if (dayNum < 1 || dayNum > dim) { gridCells.push(null); continue; }
    const dateObj = new Date(year, month, dayNum);
    const dayBills = allSortedMonthBills
      .filter((b) => effectiveDueDay(b, year, month) === dayNum)
      .map((b) => ({ bill: b, status: monthStatuses[b.id] || { paid: false, cleared: false } }));
    gridCells.push({ day: dayNum, dateObj, dayBills, isToday: sameDate(dateObj, todayZero) });
  }
  const monthDoneList = gridCells
    .filter(Boolean)
    .flatMap((cell) => cell.dayBills.filter(({ status }) => isDone(status)).map(({ bill, status }) => ({ bill, status, displayDay: cell.day })));

  // Week view days
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    const dayBills = bills
      .filter((b) => billAppliesToMonth(b, y, m) && effectiveDueDay(b, y, m) === day)
      .map((b) => ({ bill: b, status: statusesByMonth[monthKey(y, m)]?.[b.id] || { paid: false, cleared: false }, y, m }));
    return { date: d, y, m, day, dayBills, isToday: sameDate(d, todayZero) };
  });
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekLabel = weekStart.getMonth() === weekEndDate.getMonth()
    ? `${MONTH_ABBR[weekStart.getMonth()]} ${weekStart.getDate()}\u2013${weekEndDate.getDate()}, ${weekStart.getFullYear()}`
    : `${MONTH_ABBR[weekStart.getMonth()]} ${weekStart.getDate()} \u2013 ${MONTH_ABBR[weekEndDate.getMonth()]} ${weekEndDate.getDate()}, ${weekEndDate.getFullYear()}`;

  const weekOccurrences = weekDays.flatMap((wd) => wd.dayBills);
  const weekDoneList = weekDays.flatMap((wd) =>
    wd.dayBills.filter(({ status }) => isDone(status)).map(({ bill, status, y, m }) => ({ bill, status, displayDay: wd.day, y, m }))
  );
  const weekTotal = weekOccurrences.reduce((s, { bill }) => s + bill.amount, 0);
  const weekRemaining = weekOccurrences.reduce((s, { bill, status }) => s + (status.paid ? 0 : bill.amount), 0);
  const weekPending = weekOccurrences.reduce((s, { bill, status }) => s + (status.paid && !status.cleared ? bill.amount : 0), 0);

  const addBillBlock = !showForm ? (
    <button
      onClick={() => setShowForm(true)}
      className="transition-colors duration-150 active:scale-[0.98]"
      style={{
        marginTop: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.85rem',
        color: MUTED,
        background: 'transparent',
        border: `1px dashed ${LINE}`,
        borderRadius: 8,
        padding: '10px 14px',
        cursor: 'pointer',
        width: '100%',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.color = MUTED; }}
    >
      <Plus size={15} /> Add a bill
    </button>
  ) : (
    <div style={{ marginTop: '1.5rem', border: `1px solid ${LINE}`, borderRadius: 8, padding: '1rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: '0.8rem', color: MUTED, fontFamily: MONO }}>NEW BILL</span>
        <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} aria-label="Cancel" style={{ border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>
      <div className="flex" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 160px' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Bill name</label>
          <input
            type="text"
            placeholder="e.g. Electric"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') addBill(); }}
            style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 6, padding: '8px 10px', fontSize: '0.9rem', background: SURFACE, color: INK, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: '1 1 100px' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') addBill(); }}
            style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 6, padding: '8px 10px', fontSize: '0.9rem', background: SURFACE, color: INK, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: '1 1 110px' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Due date (day of month)</label>
          <input
            type="number"
            min="1"
            max="31"
            placeholder="1-31"
            value={form.dueDay}
            onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') addBill(); }}
            style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 6, padding: '8px 10px', fontSize: '0.9rem', background: SURFACE, color: INK, boxSizing: 'border-box' }}
          />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Note (optional)</label>
        <input
          type="text"
          placeholder="e.g. Autopay from Checking"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') addBill(); }}
          style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 6, padding: '8px 10px', fontSize: '0.9rem', background: SURFACE, color: INK, boxSizing: 'border-box' }}
        />
      </div>
      <button type="button" onClick={addBill} className="transition-transform duration-150 hover:brightness-110 active:scale-[0.96]" style={{ background: ACCENT, color: INK, border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: '0.85rem', cursor: 'pointer' }}>
        Add bill
      </button>
      {formError && (
        <div style={{ fontSize: '0.75rem', color: RUST, marginTop: 8 }}>{formError}</div>
      )}
      <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 8 }}>
        Bills recur every month on this due day. Each month's checkmarks are tracked independently.
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Outfit', -apple-system, sans-serif", background: PAPER, color: INK, minHeight: '100vh', padding: '2.5rem 1.25rem' }}>
      <div className="mx-auto" style={{ maxWidth: 640 }}>

        {view === 'week' ? (
          <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
            <button onClick={() => changeWeek(-1)} aria-label="Previous week" className="transition-opacity duration-150 hover:opacity-60 active:scale-90" style={{ padding: 8, borderRadius: 999, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer' }}>
              <ChevronLeft size={22} />
            </button>
            <h1 style={{ fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{weekLabel}</h1>
            <button onClick={() => changeWeek(1)} aria-label="Next week" className="transition-opacity duration-150 hover:opacity-60 active:scale-90" style={{ padding: 8, borderRadius: 999, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer' }}>
              <ChevronRight size={22} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
            <button onClick={() => changeMonth(-1)} aria-label="Previous month" className="transition-opacity duration-150 hover:opacity-60 active:scale-90" style={{ padding: 8, borderRadius: 999, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer' }}>
              <ChevronLeft size={22} />
            </button>
            <div className="text-center">
              <h1 style={{ fontFamily: SERIF, fontSize: '2rem', fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
                {MONTH_NAMES[month]} <span style={{ fontWeight: 400, color: MUTED }}>{year}</span>
              </h1>
              {isCurrentMonth && (
                <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: SAGE, marginTop: 2 }}>● current month</div>
              )}
            </div>
            <button onClick={() => changeMonth(1)} aria-label="Next month" className="transition-opacity duration-150 hover:opacity-60 active:scale-90" style={{ padding: 8, borderRadius: 999, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer' }}>
              <ChevronRight size={22} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-center" style={{ gap: 6, marginBottom: '1.75rem' }}>
          {['list', 'month', 'week', 'notes'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="transition-colors duration-150 active:scale-95"
              style={{
                fontSize: '0.72rem',
                fontFamily: MONO,
                padding: '6px 16px',
                borderRadius: 999,
                border: `1px solid ${view === v ? ACCENT : LINE}`,
                background: view === v ? ACCENT : 'transparent',
                color: view === v ? INK : MUTED,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
              onMouseEnter={(e) => { if (view !== v) e.currentTarget.style.borderColor = ACCENT; }}
              onMouseLeave={(e) => { if (view !== v) e.currentTarget.style.borderColor = LINE; }}
            >
              {v}
            </button>
          ))}
        </div>

        {bills.length === 0 && view !== 'notes' && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: MUTED }}>
            <p>No bills tracked yet. Add the first one to get started.</p>
          </div>
        )}

        {bills.length > 0 && view === 'list' && (
          <>
            {(() => {
              const activeBillsList = sortedBills.filter((b) => !isDone(monthStatuses[b.id]));
              const doneBillsList = sortedBills.filter((b) => isDone(monthStatuses[b.id]));
              return (
                <>
                  {sortedBills.length > 0 && (
                    <>
                      <div style={{ fontFamily: MONO, fontSize: '0.68rem', color: MUTED, letterSpacing: '0.05em', marginBottom: 6 }}>BILLS</div>
                      {activeBillsList.length > 0 ? (
                        <>
                          <div
                            className="flex items-center"
                            style={{ fontFamily: MONO, fontSize: '0.7rem', color: MUTED, letterSpacing: '0.04em', borderBottom: `1px solid ${LINE}`, paddingBottom: 8, marginBottom: 4 }}
                          >
                            <div style={{ width: 40 }}>DUE</div>
                            <div style={{ flex: 1 }}>BILL</div>
                            <div style={{ width: 90, textAlign: 'right' }}>AMOUNT</div>
                            <div style={{ width: 30, textAlign: 'center', marginLeft: 16 }}>PAID</div>
                            <div style={{ width: 30, textAlign: 'center', marginLeft: 8 }}>BANK</div>
                            <div style={{ width: 28 }} />
                          </div>
                          {activeBillsList.map((bill) => {
                            const status = monthStatuses[bill.id] || { paid: false, cleared: false };
                            const displayDay = Math.min(bill.dueDay, dim);
                            const dateObj = new Date(year, month, displayDay);
                            const overdue = !status.paid && dateObj.getTime() < todayZero.getTime();
                            return (
                              <ListRow
                                key={bill.id}
                                bill={bill}
                                status={status}
                                displayDay={displayDay}
                                overdue={overdue}
                                dimmed={false}
                                onTogglePaid={() => toggleStatus(bill.id, 'paid', year, month)}
                                onToggleCleared={() => toggleStatus(bill.id, 'cleared', year, month)}
                                onDelete={() => deleteBill(bill.id)}
                                onUpdateNote={(note) => updateBillNote(bill.id, note)}
                              />
                            );
                          })}
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: SAGE, fontSize: '0.9rem' }}>
                          All bills paid and cleared for {MONTH_NAMES[month]}.
                        </div>
                      )}
                    </>
                  )}
                  <CollapsibleDone count={doneBillsList.length} open={showDoneList} onToggle={() => setShowDoneList((v) => !v)}>
                    {doneBillsList.map((bill) => {
                      const status = monthStatuses[bill.id] || { paid: false, cleared: false };
                      const displayDay = Math.min(bill.dueDay, dim);
                      return (
                        <ListRow
                          key={bill.id}
                          bill={bill}
                          status={status}
                          displayDay={displayDay}
                          overdue={false}
                          dimmed={true}
                          onTogglePaid={() => toggleStatus(bill.id, 'paid', year, month)}
                          onToggleCleared={() => toggleStatus(bill.id, 'cleared', year, month)}
                          onDelete={() => deleteBill(bill.id)}
                          onUpdateNote={(note) => updateBillNote(bill.id, note)}
                        />
                      );
                    })}
                  </CollapsibleDone>
                </>
              );
            })()}
          </>
        )}

        {view === 'list' && addBillBlock}

        {view === 'list' && (
          <div style={{ marginTop: sortedBills.length > 0 ? '2rem' : '1.5rem' }}>
            {(() => {
              const activeExpensesList = sortedExpenses.filter((b) => !isDone(monthStatuses[b.id]));
              const doneExpensesList = sortedExpenses.filter((b) => isDone(monthStatuses[b.id]));
              return (
                <>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: '0.68rem', color: MUTED, letterSpacing: '0.05em' }}>
                      ONE-OFF EXPENSES — {MONTH_NAMES[month].toUpperCase()}
                    </span>
                  </div>

                  {sortedExpenses.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: MUTED, padding: '0.5rem 0' }}>No one-off expenses for {MONTH_NAMES[month]} yet.</div>
                  ) : (
                    <>
                      {activeExpensesList.length > 0 ? (
                        activeExpensesList.map((bill) => {
                          const status = monthStatuses[bill.id] || { paid: false, cleared: false };
                          const displayDay = Math.min(bill.dueDay, dim);
                          const dateObj = new Date(year, month, displayDay);
                          const overdue = !status.paid && dateObj.getTime() < todayZero.getTime();
                          return (
                            <ListRow
                              key={bill.id}
                              bill={bill}
                              status={status}
                              displayDay={displayDay}
                              overdue={overdue}
                              dimmed={false}
                              onTogglePaid={() => toggleStatus(bill.id, 'paid', year, month)}
                              onToggleCleared={() => toggleStatus(bill.id, 'cleared', year, month)}
                              onDelete={() => deleteBill(bill.id)}
                              onUpdateNote={(note) => updateBillNote(bill.id, note)}
                            />
                          );
                        })
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1rem 0', color: SAGE, fontSize: '0.9rem' }}>
                          All expenses paid and cleared for {MONTH_NAMES[month]}.
                        </div>
                      )}
                      <CollapsibleDone count={doneExpensesList.length} open={showDoneExpenses} onToggle={() => setShowDoneExpenses((v) => !v)}>
                        {doneExpensesList.map((bill) => {
                          const status = monthStatuses[bill.id] || { paid: false, cleared: false };
                          const displayDay = Math.min(bill.dueDay, dim);
                          return (
                            <ListRow
                              key={bill.id}
                              bill={bill}
                              status={status}
                              displayDay={displayDay}
                              overdue={false}
                              dimmed={true}
                              onTogglePaid={() => toggleStatus(bill.id, 'paid', year, month)}
                              onToggleCleared={() => toggleStatus(bill.id, 'cleared', year, month)}
                              onDelete={() => deleteBill(bill.id)}
                              onUpdateNote={(note) => updateBillNote(bill.id, note)}
                            />
                          );
                        })}
                      </CollapsibleDone>
                    </>
                  )}

                  {!showExpenseForm ? (
                    <button
                      onClick={() => setShowExpenseForm(true)}
                      className="transition-colors duration-150 active:scale-[0.98]"
                      style={{
                        marginTop: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.85rem',
                        color: MUTED,
                        background: 'transparent',
                        border: `1px dashed ${LINE}`,
                        borderRadius: 8,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        width: '100%',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.color = MUTED; }}
                    >
                      <Plus size={15} /> Add expense
                    </button>
                  ) : (
                    <div style={{ marginTop: '1.5rem', border: `1px solid ${LINE}`, borderRadius: 8, padding: '1rem' }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: '0.8rem', color: MUTED, fontFamily: MONO }}>NEW EXPENSE</span>
                        <button
                          type="button"
                          onClick={() => { setShowExpenseForm(false); setExpenseFormError(''); }}
                          aria-label="Cancel"
                          style={{ border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: '2 1 160px' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Expense name</label>
                          <input
                            type="text"
                            placeholder="e.g. Car repair"
                            value={expenseForm.name}
                            onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') addExpense(); }}
                            style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 6, padding: '8px 10px', fontSize: '0.9rem', background: SURFACE, color: INK, boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ flex: '1 1 100px' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') addExpense(); }}
                            style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 6, padding: '8px 10px', fontSize: '0.9rem', background: SURFACE, color: INK, boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ flex: '1 1 110px' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Date (day)</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="1-31"
                            value={expenseForm.dueDay}
                            onChange={(e) => setExpenseForm({ ...expenseForm, dueDay: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') addExpense(); }}
                            style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 6, padding: '8px 10px', fontSize: '0.9rem', background: SURFACE, color: INK, boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Note (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Paying from savings"
                          value={expenseForm.note}
                          onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') addExpense(); }}
                          style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 6, padding: '8px 10px', fontSize: '0.9rem', background: SURFACE, color: INK, boxSizing: 'border-box' }}
                        />
                      </div>
                      <button type="button" onClick={addExpense} className="transition-transform duration-150 hover:brightness-110 active:scale-[0.96]" style={{ background: ACCENT, color: INK, border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        Add expense
                      </button>
                      {expenseFormError && (
                        <div style={{ fontSize: '0.75rem', color: RUST, marginTop: 8 }}>{expenseFormError}</div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 8 }}>
                        This expense only applies to {MONTH_NAMES[month]} {year} — it won't repeat in other months.
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {bills.length > 0 && view === 'month' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 6 }}>
              {WEEKDAY_SHORT.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontFamily: MONO, color: MUTED, paddingBottom: 2 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
              {gridCells.map((cell, i) =>
                cell ? (
                  <div
                    key={i}
                    style={{
                      minHeight: 90,
                      border: `1px solid ${cell.isToday ? SAGE : LINE}`,
                      borderRadius: 8,
                      padding: '5px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      background: cell.isToday ? `${SAGE}14` : 'transparent'
                    }}
                  >
                    <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: cell.isToday ? 600 : 500, color: INK }}>{cell.day}</div>
                    {cell.dayBills.filter(({ status }) => !isDone(status)).map(({ bill, status }) => {
                      const overdue = !status.paid && cell.dateObj.getTime() < todayZero.getTime();
                      return (
                        <div key={bill.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span
                            style={{
                              flex: 1,
                              fontSize: 10,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: overdue ? RUST : INK
                            }}
                            title={`${bill.name}${bill.recurring === false ? ' (one-time)' : ''} \u2014 $${fmt(bill.amount)}${bill.note ? ` \u2014 ${bill.note}` : ''}`}
                          >
                            {bill.name}
                          </span>
                          <StampCheck size={15} checked={status.paid} color={AMBER} label={`Mark ${bill.name} as paid`} onClick={() => toggleStatus(bill.id, 'paid', year, month)} />
                          <StampCheck size={15} checked={status.cleared} color={SAGE} label={`Mark ${bill.name} as cleared the bank`} onClick={() => toggleStatus(bill.id, 'cleared', year, month)} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div key={i} />
                )
              )}
            </div>
            <CollapsibleDone count={monthDoneList.length} open={showDoneMonth} onToggle={() => setShowDoneMonth((v) => !v)}>
              {monthDoneList.map(({ bill, status, displayDay }) => (
                <ListRow
                  key={bill.id}
                  bill={bill}
                  status={status}
                  displayDay={displayDay}
                  overdue={false}
                  dimmed={true}
                  onTogglePaid={() => toggleStatus(bill.id, 'paid', year, month)}
                  onToggleCleared={() => toggleStatus(bill.id, 'cleared', year, month)}
                  onDelete={() => deleteBill(bill.id)}
                  onUpdateNote={(note) => updateBillNote(bill.id, note)}
                />
              ))}
            </CollapsibleDone>
          </>
        )}

        {bills.length > 0 && view === 'week' && (
          <div>
            {weekDays.map((wd, idx) => {
              const activeDayBills = wd.dayBills.filter(({ status }) => !isDone(status));
              return (
                <div key={idx} style={{ borderBottom: `1px solid ${LINE}`, padding: '10px 0' }}>
                  <div className="flex items-baseline" style={{ gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: '0.7rem', color: MUTED, width: 34 }}>{WEEKDAY_SHORT[idx]}</span>
                    <span style={{ fontFamily: MONO, fontSize: '0.85rem', fontWeight: wd.isToday ? 600 : 400, color: wd.isToday ? SAGE : INK }}>
                      {MONTH_ABBR[wd.m]} {wd.day}
                    </span>
                  </div>
                  {activeDayBills.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: MUTED, paddingLeft: 42 }}>No bills due</div>
                  ) : (
                    activeDayBills.map(({ bill, status, y, m }) => {
                      const dateObj = new Date(y, m, wd.day);
                      const overdue = !status.paid && dateObj.getTime() < todayZero.getTime();
                      return (
                        <div key={bill.id} className="flex items-center" style={{ padding: '6px 0', paddingLeft: 42 }}>
                          <div style={{ flex: 1, fontSize: '0.9rem' }}>
                            {bill.name}
                            {bill.recurring === false && (
                              <span style={{ fontSize: '0.65rem', color: MUTED, marginLeft: 8, fontFamily: MONO, border: `1px solid ${LINE}`, borderRadius: 4, padding: '1px 5px' }}>
                                one-time
                              </span>
                            )}
                            {overdue && <span style={{ fontSize: '0.68rem', color: RUST, marginLeft: 8, fontFamily: MONO }}>past due</span>}
                            <BillNoteField bill={bill} onUpdateNote={(note) => updateBillNote(bill.id, note)} />
                          </div>
                          <div style={{ width: 80, textAlign: 'right', fontFamily: MONO, fontSize: '0.85rem' }}>${fmt(bill.amount)}</div>
                          <div style={{ marginLeft: 12 }}>
                            <StampCheck checked={status.paid} color={AMBER} label={`Mark ${bill.name} as paid`} onClick={() => toggleStatus(bill.id, 'paid', y, m)} />
                          </div>
                          <div style={{ marginLeft: 8 }}>
                            <StampCheck checked={status.cleared} color={SAGE} label={`Mark ${bill.name} as cleared the bank`} onClick={() => toggleStatus(bill.id, 'cleared', y, m)} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
            <CollapsibleDone count={weekDoneList.length} open={showDoneWeek} onToggle={() => setShowDoneWeek((v) => !v)}>
              {weekDoneList.map(({ bill, status, displayDay, y, m }) => (
                <ListRow
                  key={bill.id}
                  bill={bill}
                  status={status}
                  displayDay={displayDay}
                  overdue={false}
                  dimmed={true}
                  onTogglePaid={() => toggleStatus(bill.id, 'paid', y, m)}
                  onToggleCleared={() => toggleStatus(bill.id, 'cleared', y, m)}
                  onDelete={() => deleteBill(bill.id)}
                  onUpdateNote={(note) => updateBillNote(bill.id, note)}
                />
              ))}
            </CollapsibleDone>
          </div>
        )}

        {view === 'notes' && (
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <span style={{ fontFamily: MONO, fontSize: '0.7rem', color: MUTED, letterSpacing: '0.04em' }}>
                NOTES — {MONTH_NAMES[month].toUpperCase()} {year}
              </span>
              <button
                onClick={() => {
                  if (notesEditing) {
                    saveNotes();
                  } else {
                    setDraftNotes(notesByMonth[mk] || '');
                    setNotesEditing(true);
                  }
                }}
                style={{ fontSize: '0.78rem', fontFamily: MONO, color: SAGE, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {notesEditing ? 'Done' : 'Edit'}
              </button>
            </div>
            {notesEditing ? (
              <>
                <div className="flex" style={{ gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'H1', prefix: '# ' },
                    { label: 'H2', prefix: '## ' },
                    { label: 'Bullet', prefix: '- ' },
                    { label: 'Checkbox', prefix: '- [ ] ' }
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => applyNoteFormat(btn.prefix)}
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: MONO,
                        padding: '5px 12px',
                        borderRadius: 6,
                        border: `1px solid ${LINE}`,
                        background: 'transparent',
                        color: MUTED,
                        cursor: 'pointer'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={notesTextareaRef}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder={'# Heading\n- bullet point\n- [ ] a task to check off'}
                  rows={12}
                  style={{
                    width: '100%',
                    border: `1px solid ${LINE}`,
                    borderRadius: 6,
                    padding: '10px 12px',
                    fontSize: '0.9rem',
                    fontFamily: MONO,
                    background: SURFACE,
                    color: INK,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '0.68rem', color: MUTED, marginTop: 6 }}>
                  Place your cursor on a line, then click a button to apply that style to it. These notes are specific to {MONTH_NAMES[month]} {year}.
                </div>
              </>
            ) : (notesByMonth[mk] || '').trim() ? (
              <div>{renderNotes(notesByMonth[mk], toggleNoteCheckbox, colors)}</div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: MUTED }}>No notes yet for {MONTH_NAMES[month]} — click Edit to add some.</div>
            )}
          </div>
        )}

        {(view === 'month' || view === 'week') && addBillBlock}

        {bills.length > 0 && view !== 'notes' && (
          <div style={{ marginTop: '2rem', paddingTop: '1.1rem', borderTop: `1.5px dashed ${LINE}`, fontFamily: MONO }}>
            {view === 'week' ? (
              <>
                <div className="flex justify-between" style={{ fontSize: '0.85rem', color: MUTED, marginBottom: 4 }}>
                  <span>total due this week</span>
                  <span>${fmt(weekTotal)}</span>
                </div>
                {weekPending > 0 && (
                  <div className="flex justify-between" style={{ fontSize: '0.85rem', color: AMBER, marginBottom: 4 }}>
                    <span>paid, pending bank clearance</span>
                    <span>${fmt(weekPending)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline" style={{ marginTop: 8, paddingTop: 10, borderTop: `1px solid ${LINE}` }}>
                  <span style={{ fontSize: '0.9rem', color: INK, fontFamily: "'Outfit', -apple-system, sans-serif" }}>remaining to pay this week</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 600, color: weekRemaining > 0 ? RUST : SAGE }}>${fmt(weekRemaining)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between" style={{ fontSize: '0.85rem', color: MUTED, marginBottom: 4 }}>
                  <span>total due this month</span>
                  <span>${fmt(totalDue)}</span>
                </div>
                {pendingClearance > 0 && (
                  <div className="flex justify-between" style={{ fontSize: '0.85rem', color: AMBER, marginBottom: 4 }}>
                    <span>paid, pending bank clearance</span>
                    <span>${fmt(pendingClearance)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline" style={{ marginTop: 8, paddingTop: 10, borderTop: `1px solid ${LINE}` }}>
                  <span style={{ fontSize: '0.9rem', color: INK, fontFamily: "'Outfit', -apple-system, sans-serif" }}>remaining to pay</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 600, color: remaining > 0 ? RUST : SAGE }}>${fmt(remaining)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {saveError && (
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: RUST, textAlign: 'center' }}>
            Changes couldn't be saved — check your connection and try again.
          </div>
        )}
      </div>
    </div>
  );
}
