/* =========================================================================
   HydraTrack AI — standalone PWA build (no bundler, no Node required)
   Loaded via Babel Standalone as a plain <script type="text/babel">.

   A hydration + lab-trend + body/style wellness app.

   Data persistence: window.storage, backed by a small shim over the
   browser's localStorage (see index.html) so data survives closing the
   browser, closing the installed PWA, and restarting the phone. All data
   stays on-device — nothing is sent anywhere.
   Keys:
     - "profile"     -> profile + glass config + style prefs + notif settings
     - "water-logs"  -> array of water entries
     - "hb-logs"     -> array of lab Hb entries
   ========================================================================= */

const { useState, useEffect, useCallback, useMemo, useRef } = React;

// ---------- constants ----------

const GLASS_PRESETS = [150, 200, 250, 300, 500];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", mlPerKg: 30 },
  { id: "light", label: "Lightly active", mlPerKg: 33 },
  { id: "moderate", label: "Moderately active", mlPerKg: 36 },
  { id: "active", label: "Very active", mlPerKg: 40 },
];

const STYLE_CATEGORIES = [
  "Casual", "Smart Casual", "Formal", "College", "Office",
  "Party", "Date", "Travel", "Streetwear", "Minimal", "Traditional",
];

const FIT_PREFS = ["Slim fit", "Regular fit", "Relaxed fit", "Oversized", "Minimal", "Trendy", "Classic", "Streetwear", "Traditional"];

const WARDROBE = {
  Casual: {
    tops: ["Relaxed-fit white T-shirt", "Sage green crewneck tee", "Light denim overshirt"],
    bottoms: ["Straight-fit dark blue jeans", "Beige chino shorts", "Relaxed khaki trousers"],
    shoes: ["Minimal white sneakers", "Canvas low-tops", "Suede loafers"],
    accessories: ["Silver watch + simple bracelet", "Canvas tote", "Woven belt"],
    palettes: [["White", "Navy", "Black"], ["Olive", "Cream", "Brown"], ["Beige", "Brown", "White"]],
  },
  "Smart Casual": {
    tops: ["Oxford button-down shirt", "Fine-knit polo", "Textured henley"],
    bottoms: ["Tapered chinos", "Dark wash jeans", "Tailored cotton trousers"],
    shoes: ["Leather derbies", "Clean white leather sneakers", "Suede chukka boots"],
    accessories: ["Leather strap watch", "Slim brown belt", "Pocket square"],
    palettes: [["Navy", "White", "Tan"], ["Grey", "Burgundy", "White"], ["Stone", "Black", "White"]],
  },
  Formal: {
    tops: ["Crisp white dress shirt", "Charcoal fitted blazer", "Slim-fit black shirt"],
    bottoms: ["Tailored wool trousers", "Slim charcoal suit pants", "Pressed black trousers"],
    shoes: ["Oxford leather shoes", "Polished black loafers", "Cap-toe derbies"],
    accessories: ["Silk tie", "Leather belt", "Minimal cufflinks"],
    palettes: [["Black", "White", "Silver"], ["Navy", "White", "Grey"], ["Charcoal", "White", "Burgundy"]],
  },
  College: {
    tops: ["Oversized graphic hoodie", "Plain crewneck sweatshirt", "Half-zip pullover"],
    bottoms: ["Relaxed joggers", "Straight jeans", "Cargo pants"],
    shoes: ["Chunky trainers", "Classic canvas sneakers", "Retro runners"],
    accessories: ["Backpack", "Beanie", "Crossbody bag"],
    palettes: [["Grey", "Black", "White"], ["Navy", "Red", "White"], ["Green", "Beige", "Black"]],
  },
  Office: {
    tops: ["Light blue formal shirt", "Fitted knit sweater", "Structured blouse"],
    bottoms: ["Straight-leg trousers", "Pencil skirt", "Tailored chinos"],
    shoes: ["Leather block heels", "Polished brogues", "Loafers"],
    accessories: ["Structured tote", "Minimal stud earrings", "Slim belt"],
    palettes: [["Navy", "White", "Camel"], ["Black", "Grey", "White"], ["Burgundy", "Black", "Cream"]],
  },
  Party: {
    tops: ["Satin button-up shirt", "Fitted metallic top", "Sheer overlay blouse"],
    bottoms: ["Slim black trousers", "Sequin mini skirt", "Dark tailored jeans"],
    shoes: ["Heeled ankle boots", "Patent leather loafers", "Strappy heels"],
    accessories: ["Statement earrings", "Clutch bag", "Layered chains"],
    palettes: [["Black", "Gold", "Silver"], ["Emerald", "Black", "Gold"], ["Wine", "Black", "Silver"]],
  },
  Date: {
    tops: ["Fitted button-down", "Soft knit top", "Wrap blouse"],
    bottoms: ["Dark slim jeans", "Midi skirt", "Tailored trousers"],
    shoes: ["Clean white sneakers", "Block heels", "Loafers"],
    accessories: ["Delicate necklace", "Leather watch", "Small crossbody bag"],
    palettes: [["Burgundy", "Black", "White"], ["Blush", "White", "Grey"], ["Navy", "White", "Tan"]],
  },
  Travel: {
    tops: ["Breathable linen shirt", "Soft oversized tee", "Packable windbreaker"],
    bottoms: ["Comfortable joggers", "Stretch chinos", "Cargo trousers"],
    shoes: ["Comfortable trainers", "Slip-on sneakers", "Trail-friendly shoes"],
    accessories: ["Crossbody sling bag", "Cap", "Sunglasses"],
    palettes: [["Beige", "Olive", "White"], ["Grey", "Black", "White"], ["Sand", "Brown", "Navy"]],
  },
  Streetwear: {
    tops: ["Oversized graphic tee", "Boxy cropped jacket", "Baggy hoodie"],
    bottoms: ["Wide-leg cargo pants", "Baggy denim", "Track pants"],
    shoes: ["Chunky basketball sneakers", "High-top sneakers", "Retro runners"],
    accessories: ["Bucket hat", "Crossbody bag", "Layered chains"],
    palettes: [["Black", "White", "Red"], ["Grey", "Neon", "Black"], ["Beige", "Black", "Orange"]],
  },
  Minimal: {
    tops: ["Plain crewneck tee", "Clean-line shirt", "Simple knit top"],
    bottoms: ["Straight tailored trousers", "Plain dark jeans", "Simple midi skirt"],
    shoes: ["White leather sneakers", "Plain loafers", "Minimal sandals"],
    accessories: ["Thin gold band", "Simple watch", "Small structured bag"],
    palettes: [["White", "Black", "Grey"], ["Beige", "White", "Tan"], ["Black", "White", "Stone"]],
  },
  Traditional: {
    tops: ["Embroidered kurta", "Classic saree blouse", "Nehru-collar shirt"],
    bottoms: ["Tailored churidar", "Draped saree", "Straight-fit pyjama"],
    shoes: ["Juttis", "Embellished flats", "Classic sandals"],
    accessories: ["Statement earrings", "Dupatta", "Traditional bangles"],
    palettes: [["Maroon", "Gold", "Cream"], ["Teal", "Gold", "White"], ["Mustard", "Green", "Cream"]],
  },
};

const COLOR_SWATCH = {
  White: "#FAFAF9", Navy: "#1E3A5F", Black: "#111111", Beige: "#E8DCC8", Brown: "#6B4A32",
  Olive: "#6B7A4A", Cream: "#F3ECD9", Grey: "#9CA3AF", Tan: "#C9A57B", Stone: "#B8AFA0",
  Burgundy: "#7A2333", Camel: "#C19A6B", Gold: "#C9A227", Silver: "#C0C0C0", Emerald: "#2F6F5E",
  Wine: "#5E2129", Blush: "#E8C4C4", Sand: "#D8C4A0", Red: "#B23A2E", Neon: "#C7F464",
  Orange: "#D9772E", Maroon: "#6B1E23", Teal: "#1F6B68", Mustard: "#C9A227", Green: "#3F6B3A",
};
function swatch(name) { return COLOR_SWATCH[name] || "#999999"; }

// ---------- utils ----------

function pad2(n) { return String(n).padStart(2, "0"); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function dateStrDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtDateFull(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function fmtTime(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${period}`;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function round1(n) { return Math.round(n * 10) / 10; }

function estimateTarget(profile) {
  const w = parseFloat(profile.weightKg);
  if (!w || w <= 0) return null;
  const level = ACTIVITY_LEVELS.find((a) => a.id === profile.activityLevel) || ACTIVITY_LEVELS[1];
  const ml = clamp(Math.round((w * level.mlPerKg) / 50) * 50, 1000, 4000);
  return ml;
}

function litres(ml) { return round1(ml / 1000); }

function computeStreak(waterLogs, target) {
  const byDay = {};
  for (const l of waterLogs) byDay[l.date] = (byDay[l.date] || 0) + l.ml;
  const todayHit = (byDay[todayStr()] || 0) >= target;
  let current = 0;
  let cursor = 0;
  // if today hasn't hit target yet, start counting from yesterday so an in-progress day doesn't break the streak
  if (!todayHit) cursor = 1;
  while (true) {
    const d = dateStrDaysAgo(cursor);
    if ((byDay[d] || 0) >= target) { current++; cursor++; } else break;
  }
  // best streak across full history
  const allDates = Object.keys(byDay).sort();
  let best = 0, run = 0, prevDate = null;
  for (const d of allDates) {
    if ((byDay[d] || 0) >= target) {
      if (prevDate) {
        const gapDays = (new Date(d) - new Date(prevDate)) / 86400000;
        run = gapDays === 1 ? run + 1 : 1;
      } else run = 1;
      best = Math.max(best, run);
      prevDate = d;
    } else {
      prevDate = null; run = 0;
    }
  }
  const totalSuccessDays = allDates.filter((d) => byDay[d] >= target).length;
  return { current, best: Math.max(best, current), totalSuccessDays };
}

// ---------- storage helpers ----------

async function loadJSON(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    if (!res) return fallback;
    return JSON.parse(res.value);
  } catch (e) {
    return fallback;
  }
}
async function saveJSON(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
    return true;
  } catch (e) {
    return false;
  }
}

const DEFAULT_PROFILE = {
  name: "", age: "", gender: "Prefer not to say", heightCm: "", weightKg: "",
  activityLevel: "light",
  glassMl: 200,
  useCustomTarget: false, customTargetMl: 2000,
  preferredStyle: "Casual", fitPreference: "Regular fit",
  measurements: { chest: "", waist: "", hip: "", shoulder: "", inseam: "" },
  notif: { enabled: false, interval: 90, start: "08:00", end: "21:00" },
};

// =========================================================================
// Root App
// =========================================================================

function App() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("home");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [waterLogs, setWaterLogs] = useState([]);
  const [hbLogs, setHbLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, w, h] = await Promise.all([
        loadJSON("profile", DEFAULT_PROFILE),
        loadJSON("water-logs", []),
        loadJSON("hb-logs", []),
      ]);
      setProfile({ ...DEFAULT_PROFILE, ...p, measurements: { ...DEFAULT_PROFILE.measurements, ...(p.measurements || {}) }, notif: { ...DEFAULT_PROFILE.notif, ...(p.notif || {}) } });
      setWaterLogs(w);
      setHbLogs(h);
      setLoading(false);
    })();
  }, []);

  const showToast = useCallback((msg, kind = "info") => {
    setToast({ msg, kind, id: uid() });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const persistProfile = useCallback(async (next) => {
    setProfile(next);
    const ok = await saveJSON("profile", next);
    if (!ok) showToast("Couldn't save your profile — try again.", "error");
  }, [showToast]);

  const persistWaterLogs = useCallback(async (next) => {
    setWaterLogs(next);
    const ok = await saveJSON("water-logs", next);
    if (!ok) showToast("Couldn't save that entry — try again.", "error");
  }, [showToast]);

  const persistHbLogs = useCallback(async (next) => {
    setHbLogs(next);
    const ok = await saveJSON("hb-logs", next);
    if (!ok) showToast("Couldn't save that lab result — try again.", "error");
  }, [showToast]);

  const dailyTarget = useMemo(() => {
    if (profile.useCustomTarget && profile.customTargetMl) return profile.customTargetMl;
    return estimateTarget(profile) || 2000;
  }, [profile]);

  const addWater = useCallback((glasses, customMl) => {
    const glassMl = Number(profile.glassMl) || 200;
    const ml = customMl != null ? customMl : glasses * glassMl;
    if (!ml || ml <= 0 || ml > 5000) {
      showToast("Enter a water amount between 1 and 5000 ml.", "error");
      return;
    }
    const now = new Date();
    const entry = {
      id: uid(),
      date: todayStr(),
      time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
      ml,
      glasses: customMl != null ? round1(ml / glassMl) : glasses,
      glassCapacity: glassMl,
    };
    persistWaterLogs([...waterLogs, entry]);
    showToast(`+${ml} ml logged 💧`);
  }, [profile.glassMl, waterLogs, persistWaterLogs, showToast]);

  const undoLast = useCallback(() => {
    const todays = waterLogs.filter((l) => l.date === todayStr());
    if (todays.length === 0) { showToast("Nothing to undo today."); return; }
    const last = todays.reduce((a, b) => (a.time > b.time ? a : b));
    persistWaterLogs(waterLogs.filter((l) => l.id !== last.id));
    showToast("Last entry removed.");
  }, [waterLogs, persistWaterLogs, showToast]);

  const deleteWaterEntry = useCallback((id) => {
    persistWaterLogs(waterLogs.filter((l) => l.id !== id));
  }, [waterLogs, persistWaterLogs]);

  const addHb = useCallback((entry) => {
    const val = parseFloat(entry.value);
    if (!entry.date || isNaN(val) || val <= 0 || val > 25) {
      showToast("Enter a valid date and Hb value.", "error");
      return false;
    }
    const next = [...hbLogs, { ...entry, id: uid(), value: val }].sort((a, b) => a.date.localeCompare(b.date));
    persistHbLogs(next);
    showToast("Lab result saved.");
    return true;
  }, [hbLogs, persistHbLogs, showToast]);

  const deleteHb = useCallback((id) => {
    persistHbLogs(hbLogs.filter((h) => h.id !== id));
  }, [hbLogs, persistHbLogs]);

  const theme = dark ? THEME.dark : THEME.light;

  if (loading) {
    return (
      <div className={cx("min-h-screen flex items-center justify-center", theme.bg)}>
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">💧</div>
          <div className={cx("text-sm", theme.subtext)}>Loading HydraTrack…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cx("min-h-screen font-sans", theme.bg, theme.text)} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-md mx-auto pb-24 min-h-screen relative" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}>
        <Header profile={profile} dark={dark} setDark={setDark} theme={theme} tab={tab} />

        <main className="px-4 pt-4">
          {tab === "home" && (
            <Home profile={profile} waterLogs={waterLogs} hbLogs={hbLogs} dailyTarget={dailyTarget}
                  onAddWater={addWater} theme={theme} setTab={setTab} />
          )}
          {tab === "water" && (
            <WaterScreen profile={profile} waterLogs={waterLogs} dailyTarget={dailyTarget}
                         onAddWater={addWater} onUndo={undoLast} theme={theme} />
          )}
          {tab === "history" && (
            <HistoryScreen waterLogs={waterLogs} dailyTarget={dailyTarget} onDelete={deleteWaterEntry} theme={theme} />
          )}
          {tab === "hb" && (
            <HbScreen hbLogs={hbLogs} waterLogs={waterLogs} onAdd={addHb} onDelete={deleteHb} theme={theme} />
          )}
          {tab === "body" && (
            <BodyScreen profile={profile} theme={theme} />
          )}
          {tab === "style" && (
            <StyleScreen profile={profile} onSave={persistProfile} theme={theme} />
          )}
          {tab === "profile" && (
            <ProfileScreen profile={profile} onSave={persistProfile} theme={theme} showToast={showToast} />
          )}
        </main>

        <BottomNav tab={tab} setTab={setTab} theme={theme} />
        {toast && <Toast toast={toast} theme={theme} />}
      </div>
    </div>
  );
}

// ---------- theme ----------

const THEME = {
  light: {
    bg: "bg-stone-50", text: "text-slate-900", subtext: "text-slate-500",
    card: "bg-white border border-slate-200", cardAlt: "bg-teal-50 border border-teal-100",
    accent: "text-teal-700", accentBg: "bg-teal-600", accentBgSoft: "bg-teal-100",
    nav: "bg-white border-t border-slate-200", navActive: "text-teal-700", navInactive: "text-slate-400",
    ring: "#0d9488", ringTrack: "#e2e8f0", danger: "text-rose-600", input: "bg-white border border-slate-300 text-slate-900",
    divider: "divide-slate-200", borderSoft: "border-slate-200", softBg: "bg-slate-100",
  },
  dark: {
    bg: "bg-slate-950", text: "text-slate-100", subtext: "text-slate-400",
    card: "bg-slate-900 border border-slate-800", cardAlt: "bg-teal-950 border border-teal-900",
    accent: "text-teal-400", accentBg: "bg-teal-500", accentBgSoft: "bg-teal-900",
    nav: "bg-slate-900 border-t border-slate-800", navActive: "text-teal-400", navInactive: "text-slate-600",
    ring: "#2dd4bf", ringTrack: "#1e293b", danger: "text-rose-400", input: "bg-slate-800 border border-slate-700 text-slate-100",
    divider: "divide-slate-800", borderSoft: "border-slate-800", softBg: "bg-slate-800",
  },
};
function cx(...a) { return a.filter(Boolean).join(" "); }

// ---------- shared UI ----------

function Header({ profile, dark, setDark, theme, tab }) {
  const titles = { home: "HydraTrack AI", water: "Water", history: "History", hb: "Hb & Lab Results", body: "Body Profile", style: "AI Style Advisor", profile: "Profile" };
  return (
    <header className={cx("sticky top-0 z-20 px-4 pb-3 flex items-center justify-between backdrop-blur", theme.bg)}
      style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}>
      <div>
        <div className="text-xs uppercase tracking-widest opacity-60">{tab === "home" ? (profile.name ? `Hi, ${profile.name}` : "Welcome back") : "HydraTrack AI"}</div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>{titles[tab]}</h1>
      </div>
      <button
        onClick={() => setDark(!dark)}
        aria-label="Toggle dark mode"
        className={cx("w-10 h-10 rounded-full flex items-center justify-center text-lg", theme.card)}
      >
        {dark ? "☀️" : "🌙"}
      </button>
    </header>
  );
}

function BottomNav({ tab, setTab, theme }) {
  const items = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "water", label: "Water", icon: "💧" },
    { id: "history", label: "History", icon: "📅" },
    { id: "hb", label: "Hb", icon: "🩸" },
    { id: "body", label: "Body", icon: "🧍" },
    { id: "style", label: "Style", icon: "👕" },
    { id: "profile", label: "Profile", icon: "⚙️" },
  ];
  return (
    <nav className={cx("fixed bottom-0 left-0 right-0 z-30", theme.nav)} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="max-w-md mx-auto grid grid-cols-7">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className={cx("flex flex-col items-center justify-center py-2 gap-0.5 min-h-14", tab === it.id ? theme.navActive : theme.navInactive)}
          >
            <span className="text-lg leading-none">{it.icon}</span>
            <span className="text-xs font-medium leading-none">{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function Card({ children, className, theme }) {
  return <div className={cx("rounded-2xl p-4", theme.card, className)}>{children}</div>;
}

function Toast({ toast, theme }) {
  return (
    <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-center px-4">
      <div className={cx("max-w-md w-full rounded-xl px-4 py-3 text-sm font-medium shadow-lg",
        toast.kind === "error" ? "bg-rose-600 text-white" : "bg-slate-900 text-white")}>
        {toast.msg}
      </div>
    </div>
  );
}

function ProgressRing({ pct, size = 180, stroke = 14, theme, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamp(pct, 0, 100) / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={theme.ringTrack} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={theme.ring} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// =========================================================================
// Home
// =========================================================================

function Home({ profile, waterLogs, hbLogs, dailyTarget, onAddWater, theme, setTab }) {
  const today = todayStr();
  const todayLogs = waterLogs.filter((l) => l.date === today);
  const todayMl = todayLogs.reduce((s, l) => s + l.ml, 0);
  const pct = Math.round((todayMl / dailyTarget) * 100);
  const lastEntry = todayLogs.length ? todayLogs.reduce((a, b) => (a.time > b.time ? a : b)) : null;

  const weekAvg = useMemo(() => {
    const days = [...Array(7)].map((_, i) => dateStrDaysAgo(i));
    const totals = days.map((d) => waterLogs.filter((l) => l.date === d).reduce((s, l) => s + l.ml, 0));
    return totals.reduce((a, b) => a + b, 0) / 7;
  }, [waterLogs]);

  const insight = useMemo(() => {
    if (weekAvg === 0) return "Log your first glass to start tracking insights.";
    const diff = Math.round(((todayMl - weekAvg) / Math.max(weekAvg, 1)) * 100);
    if (todayMl === 0) return "You haven't logged any water yet today.";
    if (diff > 5) return `Today's intake is ${diff}% above your 7-day average.`;
    if (diff < -5) return `Today's intake is ${Math.abs(diff)}% below your 7-day average.`;
    return "Today's intake is right around your 7-day average.";
  }, [todayMl, weekAvg]);

  const streak = useMemo(() => computeStreak(waterLogs, dailyTarget), [waterLogs, dailyTarget]);
  const remaining = Math.max(0, dailyTarget - todayMl);
  const todaysAvgPerEntry = todayLogs.length ? Math.round(todayMl / todayLogs.length) : 0;

  const lastHb = hbLogs.length ? hbLogs[hbLogs.length - 1] : null;
  const bodyShape = describeBodyShape(profile);
  const outfitPreview = useMemo(() => generateOutfit(profile.preferredStyle, profile.fitPreference, 0), [profile.preferredStyle, profile.fitPreference]);

  return (
    <div className="space-y-4">
      <Card theme={theme} className="flex flex-col items-center">
        <ProgressRing pct={pct} theme={theme}>
          <div className="text-center">
            <div className="text-2xl font-extrabold">{todayMl}</div>
            <div className="text-xs opacity-60">/ {dailyTarget} ml</div>
          </div>
        </ProgressRing>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="text-center"><div className="font-bold">{todayLogs.reduce((s, l) => s + l.glasses, 0)}</div><div className="opacity-60 text-xs">glasses</div></div>
          <div className="w-px h-8 opacity-20 bg-current" />
          <div className="text-center"><div className="font-bold">{pct}%</div><div className="opacity-60 text-xs">of target</div></div>
          <div className="w-px h-8 opacity-20 bg-current" />
          <div className="text-center"><div className="font-bold">{lastEntry ? fmtTime(lastEntry.time) : "—"}</div><div className="opacity-60 text-xs">last drink</div></div>
        </div>
        <button
          onClick={() => onAddWater(1)}
          className={cx("mt-4 w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition", theme.accentBg)}
        >
          💧 +1 Glass ({profile.glassMl} ml)
        </button>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card theme={theme} className="text-center">
          <div className="text-xl font-extrabold">{remaining} ml</div>
          <div className="text-xs opacity-60">remaining today</div>
        </Card>
        <Card theme={theme} className="text-center">
          <div className="text-xl font-extrabold">{Math.round(weekAvg)} ml</div>
          <div className="text-xs opacity-60">7-day average</div>
        </Card>
        <Card theme={theme} className="text-center">
          <div className="text-xl font-extrabold">🔥 {streak.current}</div>
          <div className="text-xs opacity-60">day streak (best {streak.best})</div>
        </Card>
        <Card theme={theme} className="text-center">
          <div className="text-xl font-extrabold">{lastEntry ? fmtTime(lastEntry.time) : "—"}</div>
          <div className="text-xs opacity-60">last entry</div>
        </Card>
      </div>

      <Card theme={theme}>
        <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Today's insight</div>
        <p className="text-sm">{insight}</p>
      </Card>

      <button onClick={() => setTab("hb")} className="block w-full text-left">
        <Card theme={theme}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Latest Hb</div>
              {lastHb ? (
                <>
                  <div className="text-lg font-bold">{lastHb.value} {lastHb.unit || "g/dL"}</div>
                  <div className="text-xs opacity-60">Lab result: {fmtDateLabel(lastHb.date)}</div>
                </>
              ) : <div className="text-sm opacity-60">No lab results yet — tap to add one.</div>}
            </div>
            <span className="text-2xl">🩸</span>
          </div>
        </Card>
      </button>

      <button onClick={() => setTab("body")} className="block w-full text-left">
        <Card theme={theme}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Body profile</div>
              <div className="text-lg font-bold">{profile.heightCm || "—"} cm · {profile.weightKg || "—"} kg</div>
              <div className="text-xs opacity-60">Approximate build: {bodyShape.label}</div>
            </div>
            <span className="text-2xl">🧍</span>
          </div>
        </Card>
      </button>

      <button onClick={() => setTab("style")} className="block w-full text-left">
        <Card theme={theme}>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Today's style</div>
          <div className="text-sm font-semibold">{outfitPreview.top} + {outfitPreview.bottom} + {outfitPreview.shoes}</div>
          <div className="flex gap-1.5 mt-2">
            {outfitPreview.palette.map((c) => (
              <span key={c} className="w-5 h-5 rounded-full" style={{ backgroundColor: swatch(c), border: "1px solid rgba(0,0,0,0.15)" }} title={c} />
            ))}
          </div>
        </Card>
      </button>
    </div>
  );
}

// =========================================================================
// Water logging screen
// =========================================================================

function WaterScreen({ profile, waterLogs, dailyTarget, onAddWater, onUndo, theme }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const today = todayStr();
  const todayLogs = waterLogs.filter((l) => l.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const todayMl = todayLogs.reduce((s, l) => s + l.ml, 0);

  return (
    <div className="space-y-4">
      <Card theme={theme} className="text-center">
        <div className="text-xs uppercase tracking-wide opacity-60">Your glass</div>
        <div className="text-3xl font-extrabold mt-1">{profile.glassMl} ml</div>
        <div className="text-xs opacity-60 mt-1">Change this anytime in Profile — past entries keep their original amount.</div>
      </Card>

      <Card theme={theme}>
        <div className="text-sm font-semibold mb-3">Log water</div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <button key={n} onClick={() => onAddWater(n)}
              className={cx("rounded-xl py-4 flex flex-col items-center gap-1 font-bold text-white active:scale-95 transition", theme.accentBg)}>
              <span className="text-lg">+{n}</span>
              <span className="text-xs font-medium opacity-90">{n === 1 ? "Glass" : "Glasses"}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button onClick={() => setCustomOpen(true)} className={cx("rounded-xl py-3 font-semibold text-sm", theme.accentBgSoft, theme.accent)}>Custom ml</button>
          <button onClick={onUndo} className={cx("rounded-xl py-3 font-semibold text-sm border", theme.subtext, "border-current")}>Undo last entry</button>
        </div>
      </Card>

      <Card theme={theme}>
        <div className="flex justify-between items-baseline mb-2">
          <div className="text-sm font-semibold">Today's log</div>
          <div className="text-xs opacity-60">{todayMl} / {dailyTarget} ml</div>
        </div>
        {todayLogs.length === 0 ? (
          <div className="text-sm opacity-60 py-4 text-center">No entries yet. Tap +1 Glass to start.</div>
        ) : (
          <ul className={cx("divide-y", theme.divider)}>
            {todayLogs.slice().reverse().map((l) => (
              <li key={l.id} className="py-2 flex justify-between text-sm">
                <span className="opacity-70">{fmtTime(l.time)}</span>
                <span className="font-medium">+{l.ml} ml <span className="opacity-50 font-normal">({l.glasses} glass{l.glasses !== 1 ? "es" : ""} @ {l.glassCapacity}ml)</span></span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {customOpen && (
        <Modal onClose={() => setCustomOpen(false)} theme={theme} title="Custom amount">
          <input
            type="number" inputMode="numeric" autoFocus placeholder="Amount in ml"
            value={customVal} onChange={(e) => setCustomVal(e.target.value)}
            className={cx("w-full rounded-xl px-4 py-3 text-lg", theme.input)}
          />
          <button
            onClick={() => {
              const v = parseInt(customVal, 10);
              if (!v || v <= 0 || v > 5000) return;
              onAddWater(null, v);
              setCustomVal(""); setCustomOpen(false);
            }}
            className={cx("mt-3 w-full py-3 rounded-xl text-white font-bold", theme.accentBg)}
          >
            Add entry
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, theme, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={cx("w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5", theme.card)}>
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold">{title}</div>
          <button onClick={onClose} className="opacity-60 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// =========================================================================
// History screen
// =========================================================================

function HistoryScreen({ waterLogs, dailyTarget, onDelete, theme }) {
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState("days");

  const byDate = useMemo(() => {
    const map = {};
    for (const l of waterLogs) {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [waterLogs]);

  const Toggle = (
    <div className={cx("flex rounded-xl p-1 mb-3", theme.card)}>
      {["days", "trends"].map((v) => (
        <button key={v} onClick={() => setView(v)}
          className={cx("flex-1 py-2 rounded-lg text-sm font-semibold capitalize", view === v ? cx(theme.accentBg, "text-white") : "opacity-60")}>
          {v}
        </button>
      ))}
    </div>
  );

  if (byDate.length === 0) {
    return <div>{Toggle}<EmptyState theme={theme} icon="📅" text="No history yet. Your daily totals will appear here once you start logging water." /></div>;
  }

  if (view === "trends") {
    return <div>{Toggle}<AnalyticsView waterLogs={waterLogs} dailyTarget={dailyTarget} theme={theme} /></div>;
  }

  return (
    <div className="space-y-3">
      {Toggle}
      {byDate.map(([date, entries]) => {
        const ml = entries.reduce((s, e) => s + e.ml, 0);
        const glasses = round1(entries.reduce((s, e) => s + e.glasses, 0));
        const pct = Math.round((ml / dailyTarget) * 100);
        const isOpen = expanded === date;
        return (
          <Card key={date} theme={theme}>
            <button className="w-full text-left" onClick={() => setExpanded(isOpen ? null : date)}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">{fmtDateLabel(date)}</div>
                  <div className="text-xs opacity-60">{glasses} glasses · {ml} ml · {litres(ml)} L</div>
                </div>
                <div className="text-right">
                  <div className={cx("font-bold", pct >= 100 ? theme.accent : "")}>{pct}%</div>
                  <div className="text-xs opacity-50">of target</div>
                </div>
              </div>
            </button>
            {isOpen && (
              <ul className={cx("mt-3 pt-3 border-t divide-y", theme.divider, theme.borderSoft)}>
                {entries.sort((a, b) => a.time.localeCompare(b.time)).map((e) => (
                  <li key={e.id} className="py-2 flex justify-between items-center text-sm">
                    <span className="opacity-70">{fmtTime(e.time)}</span>
                    <span>+{e.ml} ml <span className="opacity-50">({e.glasses}× {e.glassCapacity}ml)</span></span>
                    <button onClick={() => onDelete(e.id)} className={cx("text-xs ml-2", theme.danger)}>Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function EmptyState({ theme, icon, text }) {
  return (
    <Card theme={theme} className="text-center py-10">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-sm opacity-60 max-w-xs mx-auto">{text}</p>
    </Card>
  );
}

// =========================================================================
// Analytics (used inside History via tab, kept simple bar viz — no external chart lib needed)
// =========================================================================

function BarChart({ data, theme, unit = "ml", height = 120 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <div className="w-full rounded-t-md" style={{
            height: `${Math.max(4, (d.value / max) * 100)}%`,
            backgroundColor: theme.ring,
            opacity: d.value === 0 ? 0.15 : 0.85,
          }} title={`${d.label}: ${d.value} ${unit}`} />
          <div className="text-xs opacity-50 mt-1 whitespace-nowrap">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsView({ waterLogs, dailyTarget, theme }) {
  const byDay = useMemo(() => {
    const m = {};
    for (const l of waterLogs) m[l.date] = (m[l.date] || 0) + l.ml;
    return m;
  }, [waterLogs]);

  const last7 = [...Array(7)].map((_, i) => dateStrDaysAgo(6 - i)).map((d) => ({ label: fmtDateLabel(d).split(" ")[1], value: byDay[d] || 0, date: d }));
  const last30 = [...Array(30)].map((_, i) => dateStrDaysAgo(29 - i)).map((d) => ({ label: "", value: byDay[d] || 0, date: d }));

  const weekVals = last7.map((d) => d.value);
  const weekAvg = Math.round(weekVals.reduce((a, b) => a + b, 0) / 7);
  const prevWeekVals = [...Array(7)].map((_, i) => byDay[dateStrDaysAgo(13 - i)] || 0);
  const prevWeekAvg = prevWeekVals.reduce((a, b) => a + b, 0) / 7;
  const monthVals = last30.map((d) => d.value);
  const monthAvg = Math.round(monthVals.reduce((a, b) => a + b, 0) / 30);

  const loggedMonthDays = last30.filter((d) => waterLogs.some((l) => l.date === d.date));
  const highest = loggedMonthDays.length ? loggedMonthDays.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const lowestCandidates = loggedMonthDays.filter((d) => d.value > 0);
  const lowest = lowestCandidates.length ? lowestCandidates.reduce((a, b) => (b.value < a.value ? b : a)) : null;

  const goalDaysMonth = last30.filter((d) => d.value >= dailyTarget).length;
  const loggedDaysMonth = loggedMonthDays.length;
  const goalPct = loggedDaysMonth ? Math.round((goalDaysMonth / loggedDaysMonth) * 100) : 0;

  const weekTrendPct = prevWeekAvg > 0 ? Math.round(((weekAvg - prevWeekAvg) / prevWeekAvg) * 100) : null;

  return (
    <div className="space-y-4">
      <Card theme={theme}>
        <div className="text-sm font-semibold mb-3">7-day intake</div>
        <BarChart data={last7} theme={theme} />
      </Card>
      <Card theme={theme}>
        <div className="text-sm font-semibold mb-3">30-day intake</div>
        <BarChart data={last30} theme={theme} height={90} />
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Card theme={theme} className="text-center"><div className="text-lg font-extrabold">{weekAvg} ml</div><div className="text-xs opacity-60">weekly average</div></Card>
        <Card theme={theme} className="text-center"><div className="text-lg font-extrabold">{monthAvg} ml</div><div className="text-xs opacity-60">monthly average</div></Card>
        <Card theme={theme} className="text-center"><div className="text-lg font-extrabold">{highest ? `${highest.value} ml` : "—"}</div><div className="text-xs opacity-60">highest day{highest ? ` (${fmtDateLabel(highest.date)})` : ""}</div></Card>
        <Card theme={theme} className="text-center"><div className="text-lg font-extrabold">{lowest ? `${lowest.value} ml` : "—"}</div><div className="text-xs opacity-60">lowest logged day{lowest ? ` (${fmtDateLabel(lowest.date)})` : ""}</div></Card>
      </div>
      <Card theme={theme}>
        <div className="text-sm font-semibold mb-1">Goal completion (30 days)</div>
        <div className="text-2xl font-extrabold">{goalPct}%</div>
        <div className="text-xs opacity-60">{goalDaysMonth} of {loggedDaysMonth || 0} logged days hit your target</div>
      </Card>
      <Card theme={theme}>
        <div className="text-sm font-semibold mb-1">Trend</div>
        <p className="text-sm">
          {weekTrendPct == null
            ? "Not enough history yet to compare this week with last week."
            : weekTrendPct === 0
              ? "Your average water intake is about the same as last week."
              : `Your average water intake ${weekTrendPct > 0 ? "increased" : "decreased"} by ${Math.abs(weekTrendPct)}% compared with last week.`}
        </p>
      </Card>
    </div>
  );
}

// =========================================================================
// Hb screen (includes analytics + trend analysis)
// =========================================================================

function HbScreen({ hbLogs, waterLogs, onAdd, onDelete, theme }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: todayStr(), value: "", unit: "g/dL", labName: "", notes: "" });

  const sorted = useMemo(() => [...hbLogs].sort((a, b) => a.date.localeCompare(b.date)), [hbLogs]);

  const avgWaterBetween = useCallback((startExclusive, endInclusive) => {
    const logs = waterLogs.filter((l) => l.date > startExclusive && l.date <= endInclusive);
    if (logs.length === 0) return null;
    const byDay = {};
    for (const l of logs) byDay[l.date] = (byDay[l.date] || 0) + l.ml;
    const days = Object.keys(byDay);
    const total = days.reduce((s, d) => s + byDay[d], 0);
    return Math.round(total / days.length);
  }, [waterLogs]);

  const associations = useMemo(() => {
    if (sorted.length < 2) return [];
    const out = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1], cur = sorted[i];
      const avgWater = avgWaterBetween(prev.date, cur.date);
      const hbChange = round1(cur.value - prev.value);
      out.push({ prev, cur, avgWater, hbChange });
    }
    return out;
  }, [sorted, avgWaterBetween]);

  // simple Pearson correlation between avg water before each point (from prior point) and Hb value, when n>=3
  const correlation = useMemo(() => {
    if (associations.length < 2) return null;
    const pts = associations.filter((a) => a.avgWater != null).map((a) => [a.avgWater, a.cur.value]);
    if (pts.length < 3) return null;
    const n = pts.length;
    const mx = pts.reduce((s, p) => s + p[0], 0) / n;
    const my = pts.reduce((s, p) => s + p[1], 0) / n;
    let num = 0, dx2 = 0, dy2 = 0;
    for (const [x, y] of pts) { num += (x - mx) * (y - my); dx2 += (x - mx) ** 2; dy2 += (y - my) ** 2; }
    if (dx2 === 0 || dy2 === 0) return null;
    return round1(num / Math.sqrt(dx2 * dy2) * 10) / 10;
  }, [associations]);

  return (
    <div className="space-y-4">
      <button onClick={() => setOpen(true)} className={cx("w-full py-3 rounded-xl text-white font-bold", theme.accentBg)}>+ Add lab result</button>

      {sorted.length === 0 ? (
        <EmptyState theme={theme} icon="🩸" text="No lab results yet. Add your Hb readings to start tracking trends over time." />
      ) : (
        <>
          <Card theme={theme}>
            <div className="text-sm font-semibold mb-2">Hb timeline</div>
            <HbLineChart data={sorted} theme={theme} />
            <ul className={cx("mt-3 divide-y", theme.divider)}>
              {sorted.slice().reverse().map((h) => (
                <li key={h.id} className="py-2 flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium">{fmtDateLabel(h.date)} — {h.value} {h.unit}</div>
                    {h.labName && <div className="text-xs opacity-50">{h.labName}</div>}
                    {h.notes && <div className="text-xs opacity-50">{h.notes}</div>}
                  </div>
                  <button onClick={() => onDelete(h.id)} className={cx("text-xs", theme.danger)}>Delete</button>
                </li>
              ))}
            </ul>
          </Card>

          <Card theme={theme}>
            <div className="text-sm font-semibold mb-1">Water + Hb trend analysis</div>
            <p className="text-xs opacity-60 mb-3">
              This feature compares your recorded water intake with your actual lab Hb values over time.
              It is for educational trend awareness only — it does not calculate or predict Hb from water intake.
            </p>
            {associations.length === 0 ? (
              <p className="text-sm">Not enough data to identify a meaningful trend. Add at least two lab results.</p>
            ) : (
              <div className="space-y-3">
                {associations.map((a, i) => (
                  <div key={i} className={cx("rounded-xl p-3 text-sm", theme.cardAlt)}>
                    {a.avgWater == null ? (
                      <p>Between {fmtDateLabel(a.prev.date)} and {fmtDateLabel(a.cur.date)}, no water intake was logged, so no association can be shown for this period.</p>
                    ) : (
                      <p>
                        Your recorded Hb {a.hbChange === 0 ? "stayed about the same" : a.hbChange > 0 ? "increased" : "decreased"} from {a.prev.value} to {a.cur.value} {a.cur.unit || "g/dL"} during a period ({fmtDateLabel(a.prev.date)}–{fmtDateLabel(a.cur.date)}) when your recorded average water intake was {a.avgWater} ml/day.
                        This is a <b>temporal association</b>, not proof that your water intake caused the Hb change.
                      </p>
                    )}
                  </div>
                ))}
                {correlation != null ? (
                  <p className="text-xs opacity-70">Simple correlation coefficient between average water intake and Hb across your logged readings: <b>r = {correlation}</b>. A correlation, even a strong one, does not establish cause and effect.</p>
                ) : (
                  <p className="text-xs opacity-70">Not enough paired data points yet to compute a correlation coefficient — this needs at least three lab results with water logged between them.</p>
                )}
              </div>
            )}
            <div className={cx("mt-3 text-xs rounded-lg p-2 opacity-80", theme.cardAlt)}>
              This feature is for educational trend analysis only. Water intake alone cannot determine hemoglobin or blood viscosity. Laboratory testing and professional medical evaluation are required for medical assessment.
            </div>
          </Card>
        </>
      )}

      {open && (
        <Modal onClose={() => setOpen(false)} theme={theme} title="Add lab result">
          <div className="space-y-3">
            <Labeled label="Date" theme={theme}>
              <input type="date" max={todayStr()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} />
            </Labeled>
            <div className="grid grid-cols-2 gap-2">
              <Labeled label="Hb value" theme={theme}>
                <input type="number" step="0.1" inputMode="decimal" placeholder="e.g. 13.5" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} />
              </Labeled>
              <Labeled label="Unit" theme={theme}>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)}>
                  <option>g/dL</option><option>g/L</option><option>mmol/L</option>
                </select>
              </Labeled>
            </div>
            <Labeled label="Lab / report name (optional)" theme={theme}>
              <input value={form.labName} onChange={(e) => setForm({ ...form, labName: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} />
            </Labeled>
            <Labeled label="Notes (optional)" theme={theme}>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} />
            </Labeled>
            <button
              onClick={() => { if (onAdd(form)) { setOpen(false); setForm({ date: todayStr(), value: "", unit: "g/dL", labName: "", notes: "" }); } }}
              className={cx("w-full py-3 rounded-xl text-white font-bold", theme.accentBg)}
            >
              Save result
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Labeled({ label, children, theme }) {
  return (
    <label className="block">
      <div className="text-xs font-medium opacity-60 mb-1">{label}</div>
      {children}
    </label>
  );
}

function HbLineChart({ data, theme }) {
  const w = 300, h = 100, pad = 20;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5;
  const pts = data.map((d, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.value - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 110 }}>
      <path d={path} fill="none" stroke={theme.ring} strokeWidth="2.5" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4" fill={theme.ring} />
          <text x={p[0]} y={h - 4} fontSize="8" textAnchor="middle" opacity="0.5">{fmtDateLabel(data[i].date)}</text>
        </g>
      ))}
    </svg>
  );
}

// =========================================================================
// Body screen
// =========================================================================

const BODY_SCALE = [
  { key: "very-lean", label: "Very Lean / Slim", bmiMax: 18.5, widthFactor: 0.05 },
  { key: "lean", label: "Lean", bmiMax: 21, widthFactor: 0.28 },
  { key: "average", label: "Average", bmiMax: 25, widthFactor: 0.52 },
  { key: "higher", label: "Higher Body Fat", bmiMax: 30, widthFactor: 0.76 },
  { key: "heavy", label: "Heavy", bmiMax: Infinity, widthFactor: 1 },
];

function describeBodyShape(profile) {
  const h = parseFloat(profile.heightCm), w = parseFloat(profile.weightKg);
  if (!h || !w) return { label: "Add height & weight", bmi: null, index: null };
  let bmi = w / ((h / 100) ** 2);

  // If optional waist/hip measurements are present, nudge the estimate —
  // still an approximation, never a precise or medical calculation.
  const m = profile.measurements || {};
  const waist = parseFloat(m.waist), hip = parseFloat(m.hip);
  if (waist && hip && h) {
    const whtr = waist / h; // waist-to-height ratio, a rough supplementary signal
    if (whtr > 0.55) bmi += 1.2;
    else if (whtr < 0.42) bmi -= 1.2;
  }

  let index = BODY_SCALE.findIndex((s) => bmi < s.bmiMax);
  if (index === -1) index = BODY_SCALE.length - 1;
  return { label: BODY_SCALE[index].label, bmi: round1(bmi), index };
}

// A single stylized side-profile figure. Every figure shares the same pose,
// scale, ground line and background — only the torso/limb width changes —
// so the five can be compared like-for-like, per the requested layout.
function BodyFigure({ widthFactor, theme, highlighted, size = 62 }) {
  const w = clamp(widthFactor, 0, 1);
  const shoulder = 16 + w * 10;
  const chest = 13 + w * 13;
  const waist = 10 + w * 17;
  const hip = 14 + w * 12;
  const cx0 = 50;
  return (
    <svg viewBox="0 0 100 220" width={size} height={size * 2.2}>
      {/* ground line */}
      <line x1="10" y1="208" x2="90" y2="208" stroke={theme.ringTrack} strokeWidth="2" />
      {/* head, side-profile */}
      <ellipse cx={cx0 + 2} cy="26" rx="13" ry="15" fill={highlighted ? theme.ring : theme.ringTrack} opacity={highlighted ? 0.95 : 0.55} />
      {/* torso + legs, single continuous silhouette, side-on stance */}
      <path
        d={`M ${cx0 - shoulder / 2} 46
            Q ${cx0} 40 ${cx0 + shoulder / 2 + 4} 48
            L ${cx0 + chest / 2 + 6} 90
            Q ${cx0 + waist / 2 + 8} 112 ${cx0 + waist / 2 + 4} 128
            Q ${cx0 + hip / 2 + 8} 140 ${cx0 + hip / 2 + 2} 150
            L ${cx0 + 10} 205
            L ${cx0 - 2} 205
            L ${cx0 - 6} 152
            L ${cx0 - hip / 2 - 4} 150
            Q ${cx0 - hip / 2 - 8} 138 ${cx0 - waist / 2 - 6} 126
            Q ${cx0 - waist / 2 - 10} 108 ${cx0 - chest / 2 - 8} 88
            L ${cx0 - shoulder / 2 - 2} 48
            Z`}
        fill={highlighted ? theme.ring : theme.ringTrack}
        opacity={highlighted ? 0.9 : 0.5}
      />
    </svg>
  );
}

function BodyScreen({ profile, theme }) {
  const shape = describeBodyShape(profile);
  const m = profile.measurements || {};
  const hasMeasurements = Object.values(m).some((v) => v);

  return (
    <div className="space-y-4">
      <Card theme={theme}>
        <div className="text-sm font-semibold mb-1">Body-shape comparison scale</div>
        <p className="text-xs opacity-60 mb-3">Same pose, scale and background for all five — only body composition changes, so you can compare them directly.</p>
        <div className="flex justify-between items-end overflow-x-auto gap-1 py-2">
          {BODY_SCALE.map((s, i) => (
            <div key={s.key} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <BodyFigure widthFactor={s.widthFactor} theme={theme} highlighted={shape.index === i} />
              <span className={cx("text-xs text-center leading-tight", shape.index === i ? cx("font-bold", theme.accent) : "opacity-50")}>{s.label}</span>
              {shape.index === i && <span className={cx("text-xs px-1.5 py-0.5 rounded-full text-white", theme.accentBg)}>You</span>}
            </div>
          ))}
        </div>

        <div className={cx("mt-3 rounded-lg p-3 text-center", theme.cardAlt)}>
          <div className="text-sm font-semibold">
            {shape.index != null ? `Closest match: ${shape.label}` : "Add height & weight to see your closest match"}
          </div>
          <div className="text-xs opacity-60 mt-0.5">{profile.heightCm || "—"} cm · {profile.weightKg || "—"} kg{shape.bmi ? ` · BMI ${shape.bmi}` : ""}</div>
        </div>

        <div className={cx("mt-3 text-xs rounded-lg p-2 text-center opacity-80", theme.cardAlt)}>
          <b>AI-generated approximate body-shape visualization based on your entered measurements.</b> Actual body shape can vary significantly even with the same height and weight — this schematic can't reproduce how you actually look, and it isn't a medical assessment.
        </div>
      </Card>

      <Card theme={theme}>
        <div className="text-sm font-semibold mb-2">Body measurements (optional)</div>
        {hasMeasurements ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(m).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className={cx("flex justify-between rounded-lg px-3 py-2", theme.softBg)}>
                <span className="opacity-60 capitalize">{k}</span><span className="font-medium">{v} cm</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm opacity-60">Add waist and hip measurements in Profile to refine which figure is selected as your closest match.</p>
        )}
      </Card>

      <Card theme={theme}>
        <div className="text-sm font-semibold mb-1">Realistic AI visualization</div>
        <p className="text-xs opacity-70 mb-3">
          A photo-realistic version of this five-figure comparison — full body, identical pose/lighting/background across all five, generated from a prompt built from your profile — needs an external image-generation API key, which isn't connected in this build. The button below is wired to a real (documented) integration point, not a placeholder; it stays disabled until a provider key is configured.
        </p>
        <button disabled title="Requires an image-generation API key — see setup notes"
          className={cx("w-full py-3 rounded-xl font-semibold text-sm cursor-not-allowed opacity-50", theme.softBg)}>
          🔒 Generate realistic visualization
        </button>
      </Card>
    </div>
  );
}

// =========================================================================
// Style screen
// =========================================================================

function generateOutfit(styleCat, fitPref, seed) {
  const w = WARDROBE[styleCat] || WARDROBE.Casual;
  const pick = (arr, offset) => arr[(seed + offset) % arr.length];
  return {
    top: pick(w.tops, 0),
    bottom: pick(w.bottoms, 1),
    shoes: pick(w.shoes, 2),
    accessories: pick(w.accessories, 0),
    palette: pick(w.palettes, 1),
    occasion: styleCat,
    fit: fitPref,
  };
}

function StyleScreen({ profile, onSave, theme }) {
  const [styleCat, setStyleCat] = useState(profile.preferredStyle || "Casual");
  const [fitPref, setFitPref] = useState(profile.fitPreference || "Regular fit");
  const [seed, setSeed] = useState(0);

  const outfit = useMemo(() => generateOutfit(styleCat, fitPref, seed), [styleCat, fitPref, seed]);
  const bodyShape = describeBodyShape(profile);

  return (
    <div className="space-y-4">
      <Card theme={theme}>
        <div className="text-sm font-semibold mb-2">Occasion</div>
        <div className="flex flex-wrap gap-2">
          {STYLE_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setStyleCat(c)}
              className={cx("px-3 py-1.5 rounded-full text-xs font-medium border",
                c === styleCat ? cx(theme.accentBg, "text-white border-transparent") : cx(theme.borderSoft, "opacity-70"))}>
              {c}
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold mt-4 mb-2">Fit preference</div>
        <div className="flex flex-wrap gap-2">
          {FIT_PREFS.map((f) => (
            <button key={f} onClick={() => setFitPref(f)}
              className={cx("px-3 py-1.5 rounded-full text-xs font-medium border",
                f === fitPref ? cx(theme.accentBg, "text-white border-transparent") : cx(theme.borderSoft, "opacity-70"))}>
              {f}
            </button>
          ))}
        </div>
      </Card>

      <Card theme={theme}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-semibold">{outfit.occasion} outfit</div>
          <span className="text-xs opacity-50">for {bodyShape.label.toLowerCase()} build</span>
        </div>
        <div className="space-y-2 text-sm">
          <OutfitRow label="Top" value={outfit.top} />
          <OutfitRow label="Bottom" value={outfit.bottom} />
          <OutfitRow label="Shoes" value={outfit.shoes} />
          <OutfitRow label="Accessories" value={outfit.accessories} />
        </div>
        <div className="mt-3">
          <div className="text-xs opacity-60 mb-1">Colour combination</div>
          <div className="flex items-center gap-2">
            {outfit.palette.map((c) => (
              <div key={c} className="flex flex-col items-center gap-1">
                <span className="w-8 h-8 rounded-full" style={{ backgroundColor: swatch(c), border: "1px solid rgba(0,0,0,0.15)" }} />
                <span className="text-xs opacity-60">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setSeed((s) => s + 1)} className={cx("mt-4 w-full py-3 rounded-xl text-white font-bold", theme.accentBg)}>
          🔁 Generate another outfit
        </button>
      </Card>

      <Card theme={theme}>
        <div className="text-sm font-semibold mb-1">About AI outfit images</div>
        <p className="text-xs opacity-70">
          Visualizing this outfit on your approximate body shape needs an external image-generation API, which isn't connected in this build (see setup notes). The text-based recommendations above are fully functional now.
        </p>
      </Card>

      <button
        onClick={() => onSave({ ...profile, preferredStyle: styleCat, fitPreference: fitPref })}
        className={cx("w-full py-3 rounded-xl font-semibold text-sm border", theme.borderSoft)}
      >
        Save as my default style
      </button>
    </div>
  );
}

function OutfitRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="opacity-50 w-24 shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

// =========================================================================
// Profile screen
// =========================================================================

function ProfileScreen({ profile, onSave, showToast, theme }) {
  const [form, setForm] = useState(profile);
  const [glassCustom, setGlassCustom] = useState("");

  useEffect(() => setForm(profile), [profile]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setM = (k, v) => setForm((f) => ({ ...f, measurements: { ...f.measurements, [k]: v } }));

  const estimate = estimateTarget(form);

  const save = () => {
    const h = parseFloat(form.heightCm), w = parseFloat(form.weightKg), age = parseInt(form.age, 10);
    if (form.heightCm && (isNaN(h) || h <= 0 || h > 260)) { showToast("Enter a valid height in cm.", "error"); return; }
    if (form.weightKg && (isNaN(w) || w <= 0 || w > 400)) { showToast("Enter a valid weight in kg.", "error"); return; }
    if (form.age && (isNaN(age) || age <= 0 || age > 120)) { showToast("Enter a valid age.", "error"); return; }
    onSave(form);
    showToast("Profile saved.");
  };

  return (
    <div className="space-y-4">
      <Card theme={theme}>
        <div className="text-sm font-semibold mb-3">About you</div>
        <div className="space-y-3">
          <Labeled label="Name (optional)" theme={theme}><input value={form.name} onChange={(e) => set({ name: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} /></Labeled>
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="Age" theme={theme}><input type="number" value={form.age} onChange={(e) => set({ age: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} /></Labeled>
            <Labeled label="Gender" theme={theme}>
              <select value={form.gender} onChange={(e) => set({ gender: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)}>
                <option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option>
              </select>
            </Labeled>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="Height (cm)" theme={theme}><input type="number" value={form.heightCm} onChange={(e) => set({ heightCm: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} /></Labeled>
            <Labeled label="Weight (kg)" theme={theme}><input type="number" value={form.weightKg} onChange={(e) => set({ weightKg: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} /></Labeled>
          </div>
          <Labeled label="Activity level" theme={theme}>
            <select value={form.activityLevel} onChange={(e) => set({ activityLevel: e.target.value })} className={cx("w-full rounded-lg px-3 py-2", theme.input)}>
              {ACTIVITY_LEVELS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </Labeled>
        </div>
      </Card>

      <Card theme={theme}>
        <div className="text-sm font-semibold mb-3">Glass size</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {GLASS_PRESETS.map((g) => (
            <button key={g} onClick={() => set({ glassMl: g })}
              className={cx("px-3 py-1.5 rounded-full text-xs font-medium border", form.glassMl === g ? cx(theme.accentBg, "text-white border-transparent") : cx(theme.borderSoft, "opacity-70"))}>
              {g} ml
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="number" placeholder="Custom ml" value={glassCustom} onChange={(e) => setGlassCustom(e.target.value)} className={cx("flex-1 rounded-lg px-3 py-2", theme.input)} />
          <button onClick={() => { const v = parseInt(glassCustom, 10); if (v > 0 && v <= 2000) { set({ glassMl: v }); setGlassCustom(""); } }} className={cx("px-4 rounded-lg font-semibold text-sm", theme.accentBgSoft, theme.accent)}>Set</button>
        </div>
        <p className="text-xs opacity-50 mt-2">Current: <b>{form.glassMl} ml</b>. Changing this only affects future entries.</p>
      </Card>

      <Card theme={theme}>
        <div className="text-sm font-semibold mb-3">Daily water target</div>
        <label className="flex items-center gap-2 text-sm mb-2">
          <input type="checkbox" checked={form.useCustomTarget} onChange={(e) => set({ useCustomTarget: e.target.checked })} />
          Set my own target
        </label>
        {form.useCustomTarget ? (
          <input type="number" value={form.customTargetMl} onChange={(e) => set({ customTargetMl: parseInt(e.target.value, 10) || 0 })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} />
        ) : (
          <div className={cx("rounded-lg px-3 py-2 text-sm", theme.cardAlt)}>
            {estimate ? `General estimate: ~${estimate} ml/day` : "Add height/weight & activity level for a general estimate"}
            <div className="text-xs opacity-70 mt-1">This is a general estimate based on your weight and activity level — not a medical prescription. Don't treat it as a required minimum, and avoid excessive water intake.</div>
          </div>
        )}
      </Card>

      <Card theme={theme}>
        <div className="text-sm font-semibold mb-3">Body measurements (optional)</div>
        <div className="grid grid-cols-2 gap-2">
          {["chest", "waist", "hip", "shoulder", "inseam"].map((k) => (
            <Labeled key={k} label={`${k[0].toUpperCase()}${k.slice(1)} (cm)`} theme={theme}>
              <input type="number" value={form.measurements[k]} onChange={(e) => setM(k, e.target.value)} className={cx("w-full rounded-lg px-3 py-2", theme.input)} />
            </Labeled>
          ))}
        </div>
      </Card>

      <Card theme={theme}>
        <div className="text-sm font-semibold mb-3">Reminders</div>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={form.notif.enabled} onChange={(e) => set({ notif: { ...form.notif, enabled: e.target.checked } })} />
          Enable water reminders (while app is open)
        </label>
        {form.notif.enabled && (
          <div className="space-y-2">
            <Labeled label="Remind me every (minutes)" theme={theme}>
              <input type="number" min="30" value={form.notif.interval} onChange={(e) => set({ notif: { ...form.notif, interval: parseInt(e.target.value, 10) || 90 } })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} />
            </Labeled>
            <div className="grid grid-cols-2 gap-2">
              <Labeled label="Start time" theme={theme}><input type="time" value={form.notif.start} onChange={(e) => set({ notif: { ...form.notif, start: e.target.value } })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} /></Labeled>
              <Labeled label="End time" theme={theme}><input type="time" value={form.notif.end} onChange={(e) => set({ notif: { ...form.notif, end: e.target.value } })} className={cx("w-full rounded-lg px-3 py-2", theme.input)} /></Labeled>
            </div>
            <p className="text-xs opacity-50">Reminders fire only while HydraTrack is open in the browser (this preview can't send background push notifications). Wrapping the app for Android with a scheduler enables true background reminders — see setup notes.</p>
          </div>
        )}
      </Card>

      <button onClick={save} className={cx("w-full py-3 rounded-xl text-white font-bold", theme.accentBg)}>Save profile</button>
    </div>
  );
}

// ---------- mount ----------
const _rootEl = document.getElementById("root");
ReactDOM.createRoot(_rootEl).render(React.createElement(App));
