import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import type { CourtCase } from "../context/AppContext";

const body: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const serif: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getBusyLevel(count: number): { dot: string; bg: string; border: string } {
  if (count === 0) return { dot: "", bg: "", border: "" };
  if (count === 1) return { dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (count === 2) return { dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200" };
  return { dot: "bg-red-500", bg: "bg-red-50", border: "border-red-200" };
}

interface Props {
  /** When true, renders without the full-page header (for embedding in dashboards) */
  embedded?: boolean;
}

export default function CourtCalendar({ embedded = false }: Props) {
  const navigate = useNavigate();
  const { courtCases, users, currentUser } = useAppContext();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState<string | null>(toDateKey(today));
  const [filterLawyerId, setFilterLawyerId] = useState<string>(
    (embedded && currentUser?.role === "lawyer") ? String(currentUser.id) : "all"
  );

  // ── Build a map: dateKey → CourtCase[] ─────────────────────────────────────
  const dateMap = useMemo(() => {
    const map = new Map<string, CourtCase[]>();
    courtCases
      .filter((c) => {
        const matchesLawyer = filterLawyerId === "all" || String(c.lawyerId) === String(filterLawyerId);
        return !c.archived && c.nextCourtDate && matchesLawyer;
      })
      .forEach((c) => {
        try {
          const d = new Date(c.nextCourtDate!);
          if (isNaN(d.getTime())) return;
          const key = toDateKey(d);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(c);
        } catch {
          // ignore bad dates
        }
      });
    return map;
  }, [courtCases, filterLawyerId]);

  // ── Today's hearings ────────────────────────────────────────────────────────
  const todayKey = toDateKey(today);
  const todaysCases = dateMap.get(todayKey) || [];

  // ── Next 7 days (excluding today) with hearings ─────────────────────────────
  const upcomingSlots = useMemo(() => {
    const slots: { key: string; label: string; cases: CourtCase[] }[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const k = toDateKey(d);
      const cs = dateMap.get(k);
      if (cs && cs.length > 0) {
        slots.push({
          key: k,
          label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
          cases: cs,
        });
      }
    }
    return slots;
  }, [dateMap, today]);

  // ── Calendar grid cells ─────────────────────────────────────────────────────
  const cells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(new Date(year, month, d));
    // Pad to complete final row
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [viewDate]);

  const selectedCases = selectedKey ? (dateMap.get(selectedKey) || []) : [];

  const prevMonth = () =>
    setViewDate((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  const goToToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(toDateKey(today));
  };

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";
  const caseLink = (id: string) => isAdmin ? `/lawyer/cases/${id}` : `/lawyer/cases/${id}`;

  return (
    <div style={body} className={embedded ? "" : "min-h-screen bg-[#F8FAFC] pb-20"}>

      {/* ── STANDALONE HEADER ─────────────────────────────────────────────── */}
      {!embedded && (
        <div className="bg-[#0B1F3A] pt-14 pb-24 px-6 md:px-12 rounded-b-[60px] shadow-2xl">
          <div className="max-w-7xl mx-auto">
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-2">
              Firm-Wide Calendar
            </p>
            <h1 style={serif} className="text-white text-3xl md:text-4xl font-bold tracking-tight mb-8">
              Court Hearing Dates
            </h1>

            {/* TODAY STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-[24px]">
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
                  Today — {today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                {todaysCases.length === 0 ? (
                  <p className="text-white font-bold text-sm">No hearings today ✓</p>
                ) : (
                  <p className="text-white font-bold text-sm">
                    {todaysCases.length} hearing{todaysCases.length > 1 ? "s" : ""} today
                  </p>
                )}
              </div>
              <div className="bg-white/5 backdrop-blur-md p-5 rounded-[24px]">
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">This Month</p>
                <p className="text-white font-bold text-sm">
                  {Array.from(dateMap.entries()).filter(([k]) => {
                    const d = new Date(k);
                    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                  }).reduce((sum, [, cs]) => sum + cs.length, 0)} matters
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-5 rounded-[24px]">
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">Next 7 Days</p>
                <p className="text-white font-bold text-sm">
                  {upcomingSlots.reduce((s, sl) => s + sl.cases.length, 0)} matters on {upcomingSlots.length} days
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EMBEDDED MINI HEADER ─────────────────────────────────────────────── */}
      {embedded && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
            📅 Court Calendar — Firm-Wide Hearing Dates
          </h2>
        </div>
      )}

      <div className={embedded ? "" : "max-w-7xl mx-auto px-6 -mt-12"}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── LEFT: MAIN CALENDAR ──────────────────────────────────────────── */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">

              {/* Month nav */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <button
                    onClick={prevMonth}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                  >
                    ‹
                  </button>
                  <h2 style={serif} className="text-xl font-bold text-slate-900">
                    {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </h2>
                  <button
                    onClick={nextMonth}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition"
                  >
                    ›
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={goToToday}
                    className="text-xs font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition uppercase tracking-wider"
                  >
                    Today
                  </button>

                  <select
                    value={filterLawyerId}
                    onChange={(e) => setFilterLawyerId(e.target.value)}
                    className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">🏢 All Lawyers</option>
                    {users.filter(u => u.role === 'lawyer').map(l => (
                      <option key={l.id} value={l.id}>👤 {l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {DAYS.map((d) => (
                  <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {cells.map((cell, idx) => {
                  if (!cell) {
                    return <div key={`empty-${idx}`} className="h-20 border-b border-r border-slate-50/80" />;
                  }
                  const key = toDateKey(cell);
                  const cases = dateMap.get(key) || [];
                  const { dot, bg, border } = getBusyLevel(cases.length);
                  const isToday = key === todayKey;
                  const isSelected = key === selectedKey;
                  const isPast = cell < today;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedKey(key)}
                      className={`h-20 p-2 border-b border-r border-slate-50 flex flex-col items-start transition-all text-left group
                        ${isSelected ? "bg-[#0B1F3A] border-[#0B1F3A] shadow-inner" : cases.length > 0 ? `${bg} border-${border} hover:opacity-90` : "hover:bg-slate-50"}
                        ${isPast && !isToday ? "opacity-60" : ""}
                      `}
                    >
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black mb-1 transition-all
                        ${isToday ? "bg-blue-600 text-white shadow-lg" : isSelected ? "text-white" : "text-slate-600 group-hover:text-slate-900"}
                      `}>
                        {cell.getDate()}
                      </span>

                      {/* Case dots */}
                      {cases.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-auto">
                          {cases.slice(0, 3).map((c) => (
                            <span key={c.id} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : dot}`} />
                          ))}
                          {cases.length > 3 && (
                            <span className={`text-[8px] font-black ml-0.5 ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                              +{cases.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 px-8 py-4 border-t border-slate-100 bg-slate-50/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Busy indicator:</p>
                {[
                  { color: "bg-emerald-500", label: "1 matter" },
                  { color: "bg-amber-500", label: "2 matters" },
                  { color: "bg-red-500", label: "3+ matters" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-[10px] text-slate-500 font-semibold">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: DAY DETAIL + UPCOMING ─────────────────────────────────── */}
          <div className="space-y-5">

            {/* Selected day panel */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
              <div className={`px-6 py-5 ${selectedCases.length > 0 ? "bg-[#0B1F3A]" : "bg-slate-50"}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${selectedCases.length > 0 ? "text-blue-400" : "text-slate-400"}`}>
                  Selected Date
                </p>
                <p className={`font-bold text-lg ${selectedCases.length > 0 ? "text-white" : "text-slate-700"}`}>
                  {selectedKey
                    ? new Date(selectedKey + "T12:00:00").toLocaleDateString("en-GB", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })
                    : "Select a date"}
                </p>
                {selectedCases.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    {getBusyLevel(selectedCases.length).dot && (
                      <span className={`w-2 h-2 rounded-full ${getBusyLevel(selectedCases.length).dot}`} />
                    )}
                    <p className="text-blue-200 text-xs font-semibold">
                      {selectedCases.length} hearing{selectedCases.length > 1 ? "s" : ""} scheduled
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                {selectedCases.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-3xl mb-2 opacity-20">📅</p>
                    <p className="text-sm italic text-slate-400">No hearings on this date</p>
                    <p className="text-xs text-slate-300 mt-1">This date is free to use</p>
                  </div>
                ) : (
                  selectedCases.map((c) => {
                    const lawyer = users.find((u) => u.id === c.lawyerId);
                    return (
                      <div
                        key={c.id}
                        className="p-4 bg-slate-50 rounded-[20px] hover:bg-blue-50 transition group"
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 leading-snug">
                            {c.fileName}
                          </p>
                          <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full uppercase
                            ${c.status === "Completed" ? "bg-emerald-100 text-emerald-700" :
                              c.status === "On Hold" ? "bg-orange-100 text-orange-700" :
                              "bg-blue-100 text-blue-700"}
                          `}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mb-3">
                          👤 {lawyer?.name || "Unassigned"}
                        </p>
                        <button
                          onClick={() => navigate(caseLink(c.id))}
                          className="text-[10px] font-black text-blue-600 uppercase tracking-wider hover:underline"
                        >
                          Open File →
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Upcoming 7 days */}
            {upcomingSlots.length > 0 && (
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Next 7 Days — Hearings
                </p>
                <div className="space-y-3">
                  {upcomingSlots.map((slot) => {
                    const { dot } = getBusyLevel(slot.cases.length);
                    return (
                      <button
                        key={slot.key}
                        onClick={() => {
                          const d = new Date(slot.key + "T12:00:00");
                          setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                          setSelectedKey(slot.key);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 transition text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">
                            {slot.label}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">
                          {slot.cases.length} matter{slot.cases.length > 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today's hearings (when embedded, shows in right panel) */}
            {embedded && todaysCases.length > 0 && (
              <div className="bg-blue-600 rounded-[32px] p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-blue-200">
                  Today's Hearings
                </p>
                <div className="space-y-2">
                  {todaysCases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(caseLink(c.id))}
                      className="w-full text-left p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition"
                    >
                      <p className="text-sm font-bold truncate">{c.fileName}</p>
                      <p className="text-[10px] text-blue-200 font-semibold mt-0.5">
                        {users.find((u) => u.id === c.lawyerId)?.name || "Unassigned"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
