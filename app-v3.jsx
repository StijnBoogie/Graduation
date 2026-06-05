// Every Space Safe — main app (v3, 5-state model)
// User-test build — see notes inline.

const SCENARIOS = {
  ok:     { key: 'ok',     label: 'Normal',           rate: 0.3, baseTemp: 28, name: 'NORMAL',
            tone: 'All clear',
            headline: 'Battery charging as expected',
            sub: 'Temperature and charging rate are within the expected range.',
            detect: 'Temperature is rising slowly and steadily, as expected during a normal charge.',
            matters: 'The battery is behaving normally. The sensor is continuously watching.',
            actions: [] },

  alert1: { key: 'alert1', label: 'Small anomaly',    rate: 1.0, baseTemp: 44, name: 'SMALL ANOMALY',
            tone: 'Attention needed',
            headline: 'Observe the battery',
            sub: 'Stay in the room and watch it.',
            detect: 'A temperature increase above the normal range.',
            matters: 'The battery may be developing an early anomaly. Moving a compromised battery can accelerate failure, so do not move it yet.',
            actions: [
              'Do not leave the battery unattended',
              'Stop charging',
            ] },

  alert2: { key: 'alert2', label: 'Elevated risk',    rate: 2.0, baseTemp: 56, name: 'ELEVATED RISK',
            tone: 'Attention needed',
            headline: 'Unplug and isolate',
            sub: 'The battery is no longer safe to use',
            detect: 'An alerting temperature increase. The rate is continuing to rise.',
            matters: 'The anomaly is no longer early. The battery is no longer safe to use and should be inspected by a professional before any further use.',
            actions: [
              'Do not leave the battery unattended',
              'Stop charging',
              'Unplug the battery, move flammable objects away from the battery',
              'Arrange inspection',
            ] },

  red1:   { key: 'red1',   label: 'Developing danger', rate: 3.5, baseTemp: 76, name: 'DEVELOPING DANGER',
            tone: 'Urgent',
            headline: 'Get out of the room',
            sub: 'Do not move the battery pack',
            detect: 'Temperature is rising rapidly. Imminent danger if no action is taken soon.',
            matters: 'Thermal runaway becomes irreversible past 150 °C. The prevention window is closing.',
            actions: [
              'Cut power only if the plug is safely reachable',
              'Do not move the battery pack',
            ] },

  red2:   { key: 'red2',   label: 'Imminent risk',    rate: 5.0, baseTemp: 96, name: 'IMMINENT RISK',
            tone: 'Urgent',
            headline: 'Evacuate space immediately',
            sub: 'Personal safety takes priority over the battery',
            detect: 'Imminent danger. Direct action is required.',
            matters: 'Thermal runaway is developing. Acting now is critical. Personal safety takes priority over the battery.',
            actions: [
              'Close door behind you',
              'Call 112',
              'Do not move the battery pack',
            ] },
};

const COLOURS = {
  ok:     { primary: '#0F7A3E', soft: '#E6F1EA', mid: '#BBD7C5', ink: '#0A3D22', ring: 'rgba(15,122,62,0.18)' },
  alert1: { primary: '#E89A33', soft: '#FCEFD6', mid: '#F2D9A6', ink: '#5A3700', ring: 'rgba(232,154,51,0.20)' },
  alert2: { primary: '#C77700', soft: '#FBE3C2', mid: '#EBC089', ink: '#4D2B00', ring: 'rgba(199,119,0,0.22)' },
  red1:   { primary: '#D9342A', soft: '#FBE0DE', mid: '#EFB1AC', ink: '#5C0A06', ring: 'rgba(217,52,42,0.22)' },
  red2:   { primary: '#9C0F1B', soft: '#F5CFCF', mid: '#DC8C8C', ink: '#3F0307', ring: 'rgba(156,15,27,0.28)' },
};

const isAlertKey = (k) => k === 'alert1' || k === 'alert2';
const isRedKey   = (k) => k === 'red1'   || k === 'red2';
const isUrgentKey = isRedKey;
const zoneOf = (k) => k === 'ok' ? 'ok' : isAlertKey(k) ? 'alert' : 'red';

// ─────── Configurable reference temperature for the graph ─────────────
// Exposed as a single source of truth so the researcher can adjust the
// reference line easily later.
const ROOM_TEMP_C = 25;

// Starting temperature for a fresh battery (no persisted history). Set
// below room temp so the rising line passes the room-temp reference on
// the way up — useful for visualising charging warmth crossing ambient.
const START_TEMP_C = 10;

// ─────── Persisted line state ─────────────────────────────────────────
// One line, shared across every scenario page on this origin. Each
// recorded sample carries the scenario key that was active when it was
// drawn, so the graph paints earlier segments in their original colour
// and only new samples take on the new scenario's colour.
//
// Shape:
//   { points: [{ t: number, v: number, k: scenarioKey }, ...] }
//
// Persisted under 'ess.line' in localStorage. We write SYNCHRONOUSLY
// inside the simulation tick so no scenario switch can lose data; an
// effect-based write would be subject to React's render scheduling and
// could drop the last point if the user clicked a moderator link before
// the effect fired.
const LINE_KEY = 'ess.line';
// Bump this whenever the line-state schema or seed convention changes.
// On load, any persisted state with a different version is discarded so
// the fresh seed (START_TEMP_C) takes effect.
const LINE_VERSION = 2;
// How many points to KEEP in localStorage. Larger than the visible window
// so multiple scenario transitions remain in history even after a long
// session — important for the moderator's colour-handoff tests.
const LINE_STORE_MAX = 2000;
// How many points to RENDER in the graph at one time (the visible
// rolling window). Each scenario sample is 1 second, so 200 ≈ 3.3 min.
const LINE_VIEW_MAX = 200;
const LINE_TICK_MS = 1000; // push a new point every second

function loadLineState() {
  try {
    const raw = localStorage.getItem(LINE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.points)) return null;
    // Invalidate state from older builds so the new seed takes effect.
    if (obj.v !== LINE_VERSION) return null;
    return obj;
  } catch (_) { return null; }
}
function saveLineState(state) {
  try { localStorage.setItem(LINE_KEY, JSON.stringify({ v: LINE_VERSION, ...state })); } catch (_) {}
}

// ─────── Live temperature simulation ─────────────────────────────────
function useSimulation(scenarioKey) {
  // Seed history. If we have persisted line state, continue from its
  // last value; otherwise build a fresh low-temperature baseline at
  // START_TEMP_C and let the simulation tick it up from there.
  const initial = React.useMemo(() => {
    const persisted = loadLineState();
    if (persisted && persisted.points.length) {
      const last = persisted.points[persisted.points.length - 1];
      return {
        points: persisted.points.slice(-LINE_STORE_MAX),
        startTemp: last.v,
      };
    }
    // Fresh start: a short flat history at START_TEMP_C with a tiny
    // amount of jitter. The line will start to rise as the simulation
    // ticks under the current scenario's rate.
    return {
      points: Array.from({ length: 30 }, (_, i) => ({
        t: i,
        v: START_TEMP_C + (Math.random() - 0.5) * 0.2,
        k: scenarioKey,
      })),
      startTemp: START_TEMP_C,
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [tempHistory, setTempHistory] = React.useState(initial.points);
  const [liveTemp, setLiveTemp] = React.useState(initial.startTemp);
  const [liveRate, setLiveRate] = React.useState(SCENARIOS[scenarioKey].rate);

  // Persist the initial state immediately on mount so a fresh-start page
  // (no prior history) doesn't lose its seed if the user navigates away
  // before the first tick fires.
  React.useEffect(() => {
    saveLineState({ points: initial.points });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const PLATEAU = { ok: 32, alert1: 60, alert2: 78, red1: 110, red2: 140 };

  React.useEffect(() => {
    const iv = setInterval(() => {
      const plateau = PLATEAU[scenarioKey];
      const headroom = Math.max(0, Math.min(1, (plateau - liveTemp) / 2));
      const effectiveTarget = headroom < 0.05 ? 0 : SCENARIOS[scenarioKey].rate * headroom;

      setLiveRate(prev => {
        const next = prev + (effectiveTarget - prev) * 0.15;
        return Math.abs(next) < 0.01 && effectiveTarget === 0 ? 0 : next;
      });
      setLiveTemp(prev => {
        const noise = (Math.random() - 0.5) * Math.max(0.005, liveRate / 60 * 0.3);
        // Rate is °C / min. We tick every LINE_TICK_MS, so delta per tick
        // is rate * (LINE_TICK_MS / 60000).
        const delta = (liveRate * LINE_TICK_MS / 60000) + noise;
        let next = prev + delta;
        next = Math.min(next, plateau);
        if (scenarioKey === 'ok' && prev > plateau) next = prev - 0.2;
        if (isAlertKey(scenarioKey) && prev > plateau) next = prev - 0.3;
        return next;
      });
      // Push a new history point every tick AND persist immediately so
      // we never lose data across a page navigation.
      setTempHistory(h => {
        const last = h[h.length - 1];
        const nextPt = { t: (last?.t ?? 0) + 1, v: liveTemp, k: scenarioKey };
        const next = h.length >= LINE_STORE_MAX ? [...h.slice(1), nextPt] : [...h, nextPt];
        saveLineState({ points: next });
        return next;
      });
    }, LINE_TICK_MS);
    return () => clearInterval(iv);
  }, [liveTemp, liveRate, scenarioKey]);

  return { liveTemp, liveRate, tempHistory };
}

// ─────── Sparkline / graph ─────────────────────────────────────────────
// Multi-segment line: each consecutive pair of points is drawn in the
// colour of the LATER point's scenario. That means once the participant
// switches to a new scenario page, only segments drawn from that moment
// onward take on the new colour; earlier segments stay as they were.
function TempGraph({ history, scenarioKey, dark = false }) {
  const W = 340, H = 150, P = 12;
  if (!history.length) return null;
  // Render only the most recent LINE_VIEW_MAX points so the visible graph
  // remains a clean rolling window; older history is still persisted and
  // continues to drive the line if the user navigates back in time.
  const visible = history.length > LINE_VIEW_MAX
    ? history.slice(-LINE_VIEW_MAX)
    : history;
  const values = visible.map(p => p.v);
  const min = Math.min(...values, ROOM_TEMP_C - 2) - 1;
  const max = Math.max(...values, ROOM_TEMP_C + 2) + 2;
  const range = max - min || 1;
  const xs = (i) => P + (i / (visible.length - 1)) * (W - P * 2);
  const ys = (v) => P + (1 - (v - min) / range) * (H - P * 2);

  const grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const labelC = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  // Build per-segment paths grouped by colour so we issue a small number
  // of <path> elements rather than one per segment.
  const segmentsByColour = {};
  for (let i = 1; i < visible.length; i++) {
    const k = visible[i].k || scenarioKey;
    const colour = (COLOURS[k] || COLOURS.ok).primary;
    const x1 = xs(i - 1).toFixed(1), y1 = ys(visible[i - 1].v).toFixed(1);
    const x2 = xs(i).toFixed(1),     y2 = ys(visible[i].v).toFixed(1);
    const seg = `M${x1},${y1} L${x2},${y2}`;
    (segmentsByColour[colour] = segmentsByColour[colour] || []).push(seg);
  }

  const lastPt = visible[visible.length - 1];
  const lastColour = (COLOURS[lastPt.k] || COLOURS[scenarioKey]).primary;

  // Soft fill area under the line — uses the current (live) scenario colour.
  const currentC = COLOURS[scenarioKey];
  const fillPath =
    `M${xs(0).toFixed(1)},${(H - P).toFixed(1)} ` +
    visible.map((p, i) => `L${xs(i).toFixed(1)},${ys(p.v).toFixed(1)}`).join(' ') +
    ` L${xs(visible.length - 1).toFixed(1)},${(H - P).toFixed(1)} Z`;

  // Reference line — Room temperature.
  const roomY = (ROOM_TEMP_C >= min && ROOM_TEMP_C <= max) ? ys(ROOM_TEMP_C) : null;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${scenarioKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={currentC.primary} stopOpacity="0.20" />
          <stop offset="100%" stopColor={currentC.primary} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line key={i} x1={P} x2={W - P} y1={P + f * (H - P * 2)} y2={P + f * (H - P * 2)} stroke={grid} strokeWidth="1" strokeDasharray="2 4" />
      ))}
      {/* Room temperature reference */}
      {roomY !== null && (
        <g>
          <line x1={P} x2={W - P} y1={roomY} y2={roomY} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
          <text x={W - P - 4} y={roomY - 4} textAnchor="end" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="rgba(0,0,0,0.45)" fontWeight="500">
            Room temp · {ROOM_TEMP_C}°C
          </text>
        </g>
      )}
      {/* area fill (current scenario tint) */}
      <path d={fillPath} fill={`url(#grad-${scenarioKey})`} />
      {/* per-colour segment paths */}
      {Object.entries(segmentsByColour).map(([colour, segs]) => (
        <path
          key={colour}
          d={segs.join(' ')}
          stroke={colour}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {/* current point */}
      <circle cx={xs(visible.length - 1)} cy={ys(lastPt.v)} r="4" fill={lastColour} />
      <circle cx={xs(visible.length - 1)} cy={ys(lastPt.v)} r="7" fill={lastColour} opacity="0.25">
        <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* x axis labels */}
      <text x={P} y={H - 2} fontSize="9" fontFamily="JetBrains Mono, monospace" fill={labelC}>-{Math.round(visible.length * LINE_TICK_MS / 60000)} min</text>
      <text x={W - P} y={H - 2} textAnchor="end" fontSize="9" fontFamily="JetBrains Mono, monospace" fill={labelC}>now</text>
    </svg>
  );
}

// ─────── Data flow: Sensor → App ──────────────────────────────────────
// The intermediate "Network" node has been removed. Connection is conveyed
// by the dots animating directly from sensor to app — the flow is just
// sensor → app.
function DataFlow({ scenarioKey }) {
  const c = COLOURS[scenarioKey];
  const Node = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: 'rgba(255,255,255,0.7)', border: `1px solid ${c.mid}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{children}</div>
      <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: c.ink, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
  const Dot = ({ delay }) => (
    <span style={{
      width: 4, height: 4, borderRadius: 99, background: c.primary, display: 'inline-block',
      animation: `esDot 1.6s ${delay}s infinite`,
    }} />
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 8px' }}>
      <Node label="Sensor">
        <svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" rx="2.5" fill="none" stroke={c.primary} strokeWidth="1.5"/><circle cx="9" cy="9" r="2.5" fill={c.primary}/></svg>
      </Node>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '0 14px', marginTop: -12 }}>
        <Dot delay={0} /><Dot delay={0.15} /><Dot delay={0.3} /><Dot delay={0.45} /><Dot delay={0.6} /><Dot delay={0.75} />
      </div>
      <Node label="App">
        <svg width="18" height="18" viewBox="0 0 18 18"><rect x="4.5" y="2" width="9" height="14" rx="2" fill="none" stroke={c.primary} strokeWidth="1.5"/><circle cx="9" cy="13.5" r="0.8" fill={c.primary}/></svg>
      </Node>
    </div>
  );
}

// ─────── Home status screen ─────────────────────────────────────────
function HomeScreen({ scenarioKey, liveTemp, liveRate, history, onBack, sensorName, sensorRoom }) {
  const s = SCENARIOS[scenarioKey];
  const c = COLOURS[scenarioKey];
  const isStable = scenarioKey === 'ok' && liveRate <= 0.03;
  const headline = isStable ? 'Battery charging as expected' : s.headline;
  const sub = isStable ? 'Temperature has settled. The sensor is still watching.' : s.sub;
  const detect = isStable ? 'Temperature has plateaued. Rate of change is effectively zero.' : s.detect;
  const matters = isStable ? 'A stable temperature during or after charging is exactly what we want to see.' : s.matters;
  const [learnOpen, setLearnOpen] = React.useState(false);

  return (
    <div style={{
      background: `linear-gradient(180deg, ${c.soft} 0%, #F7F5F1 60%)`,
      transition: 'background 0.8s ease',
      padding: '20px 16px 24px',
      position: 'relative',
    }}>
      {/* Back button */}
      {onBack && (
        <button onClick={onBack} style={{
          position: 'absolute', top: 14, left: 14, zIndex: 6,
          width: 36, height: 36, borderRadius: 99, border: `1px solid ${c.mid}`,
          background: 'rgba(255,255,255,0.75)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }} aria-label="Back">
          <svg width="10" height="16" viewBox="0 0 10 16"><path d="M8 2L2 8l6 6" stroke={c.ink} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}

      {/* Live chip */}
      <div style={{
        position: 'absolute', top: 18, right: 20,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px 5px 8px', borderRadius: 99,
        background: 'rgba(255,255,255,0.75)', border: `1px solid ${c.mid}`,
        fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace',
        color: c.ink, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600,
        zIndex: 5,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: c.primary, animation: 'esPulse 1.6s infinite' }} />
        Live
      </div>

      {/* battery name */}
      <div style={{ padding: '52px 0px 10px' }}>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.6, textTransform: 'uppercase' }}>Monitoring</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#1A1A1A', letterSpacing: -0.4, marginTop: 2 }}>{sensorName || 'E-bike battery'}</div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)' }}>{sensorRoom || 'Hallway'} · HeatGuard #A4-91</div>
      </div>

      {/* Big temp readout */}
      <div style={{
        background: 'rgba(255,255,255,0.7)', borderRadius: 20,
        border: `1px solid ${c.mid}`, padding: '20px 20px 16px',
        marginBottom: 12, backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,0,0,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Temperature</div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              fontSize: 62, lineHeight: 1, color: c.ink, letterSpacing: -2, marginTop: 6,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {liveTemp.toFixed(1)}<span style={{ fontSize: 24, color: 'rgb(10, 61, 34)' }}>°C</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,0,0,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Rate of change</div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              fontSize: 28, lineHeight: 1, color: c.primary, letterSpacing: -0.5, marginTop: 6,
              fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginRight: 2 }}><path d="M5 2l4 4H6v3H4V6H1z" fill={c.primary}/></svg>
              {liveRate.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,0,0,0.5)' }}>°C / min</div>
          </div>
        </div>

        {/* graph */}
        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <TempGraph history={history} scenarioKey={scenarioKey} />
        </div>
      </div>

      {/* Message card */}
      <div style={{
        background: c.primary, color: '#fff', borderRadius: 20,
        padding: '18px 20px', marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.75, marginBottom: 6 }}>
          {s.tone}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25, letterSpacing: -0.3 }}>{headline}</div>
        <div style={{ fontSize: 14, marginTop: 6, opacity: 0.9, lineHeight: 1.4 }}>{sub}</div>
      </div>

      {/* Actions */}
      {s.actions.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.75)', borderRadius: 20,
          border: `1px solid ${c.mid}`, padding: '16px 18px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: c.ink, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
            {isUrgentKey(scenarioKey) ? 'Do this now, in order' : 'Recommended actions'}
          </div>
          {s.actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i === s.actions.length - 1 ? 0 : 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                background: c.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              }}>{i + 1}</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.4, paddingTop: 2 }}>{a}</div>
            </div>
          ))}
        </div>
      )}

      {/* Learn more */}
      <div style={{
        background: 'rgba(255,255,255,0.75)', borderRadius: 20,
        border: `1px solid ${c.mid}`, marginBottom: 12, overflow: 'hidden',
      }}>
        <button
          onClick={() => setLearnOpen(o => !o)}
          aria-expanded={learnOpen}
          style={{
            width: '100%', padding: '14px 18px', border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', fontFamily: 'Inter, system-ui',
            color: c.ink, fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
          }}
        >
          <span>Learn more</span>
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ transform: learnOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <path d="M3 5l4 4 4-4" stroke={c.ink} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {learnOpen && (
          <div style={{ padding: '0 18px 16px', borderTop: `1px solid ${c.mid}` }}>
            <div style={{ paddingTop: 14 }}>
              <Row label="What we detect" text={detect} c={c}/>
              <Row label="What this means" text={matters} c={c}/>
            </div>
          </div>
        )}
      </div>

      {/* Data flow */}
      <div style={{
        background: 'rgba(255,255,255,0.55)', borderRadius: 20,
        border: `1px solid ${c.mid}`, padding: '6px 10px',
      }}>
        <DataFlow scenarioKey={scenarioKey} />
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,0,0,0.4)', marginTop: 14, letterSpacing: 0.4 }}>
        Sensor connected · last signal 1s ago
      </div>
    </div>
  );
}

function Row({ label, text, c }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: c.ink, opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}

Object.assign(window, { HomeScreen, useSimulation, SCENARIOS, COLOURS, DataFlow, TempGraph, isAlertKey, isRedKey, isUrgentKey, zoneOf, ROOM_TEMP_C });
