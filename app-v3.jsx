// Every Space Safe — main app (v3, 5-state model)
// British English throughout. Scenario switcher drives everything.
//
// Internally two zones (alert + red) each have two intensity bands.
// Placeholder °C/min thresholds X / Y / Z used for the prototype only.

const SCENARIOS = {
  ok:     { key: 'ok',     label: 'Normal',    rate: 0.3, baseTemp: 28, name: 'NORMAL',
            tone: 'All clear',
            headline: 'Battery is behaving normally.',
            sub: 'Temperature and charging rate are within the expected range.',
            detect: 'Temperature is rising slowly and steadily, as expected during a normal charge.',
            matters: 'The battery is behaving normally. The sensor is continuously watching.',
            actions: [] },

  alert1: { key: 'alert1', label: 'Orange 1',  rate: 1.0, baseTemp: 44, name: 'ALERT — OBSERVE',
            tone: 'Attention needed',
            headline: 'Battery is heating faster than expected.',
            sub: 'Stay in the room and watch it. Do not move the battery yet.',
            detect: 'A temperature increase above the normal range.',
            matters: 'The battery may be developing an early anomaly. Moving a compromised battery can accelerate failure, so do not move it yet.',
            actions: [
              'Unplug the charger',
              'Do not move the battery',
              'Stay in the room and observe. If the rate keeps rising, the app will escalate.',
            ] },

  alert2: { key: 'alert2', label: 'Orange 2',  rate: 2.0, baseTemp: 56, name: 'ALERT — ESCALATED',
            tone: 'Attention needed',
            headline: 'Temperature is still climbing.',
            sub: 'The battery is no longer safe to use. Remove it from the room.',
            detect: 'An alerting temperature increase. The rate is continuing to rise.',
            matters: 'The anomaly is no longer early. The battery is no longer safe to use and should be inspected by a professional before any further use.',
            actions: [
              'Unplug the charger if still connected',
              'Remove the battery from the room',
              'Have the battery inspected by a professional before reusing it',
            ] },

  red1:   { key: 'red1',   label: 'Red 1',     rate: 3.5, baseTemp: 76, name: 'ALARM — IMMINENT IF NOT ACTED ON',
            tone: 'Urgent',
            headline: 'Act now. The prevention window is closing.',
            sub: 'Unplug, remove the battery, take it outside.',
            detect: 'Temperature is rising rapidly. Imminent danger if no action is taken soon.',
            matters: 'Thermal runaway becomes irreversible past 150 °C. The prevention window is closing.',
            actions: [
              'Unplug the charger',
              'Remove the battery from the room',
              'Move it to a safe outdoor location, away from buildings and flammable materials',
            ] },

  red2:   { key: 'red2',   label: 'Red 2',     rate: 5.0, baseTemp: 96, name: 'ALARM — IMMINENT DANGER',
            tone: 'Urgent',
            headline: 'Imminent danger. Act now.',
            sub: 'Personal safety takes priority over the battery.',
            detect: 'Imminent danger. Direct removal is required.',
            matters: 'Thermal runaway is developing. Acting now is critical. Personal safety takes priority over the battery.',
            actions: [
              'Remove the battery to a safe outdoor location, away from buildings and flammable materials',
              'If you cannot do this safely, evacuate the home and call 112',
            ] },
};

const COLOURS = {
  ok:     { primary: '#0F7A3E', soft: '#E6F1EA', mid: '#BBD7C5', ink: '#0A3D22', ring: 'rgba(15,122,62,0.18)' },
  alert1: { primary: '#E89A33', soft: '#FCEFD6', mid: '#F2D9A6', ink: '#5A3700', ring: 'rgba(232,154,51,0.20)' },
  alert2: { primary: '#C77700', soft: '#FBE3C2', mid: '#EBC089', ink: '#4D2B00', ring: 'rgba(199,119,0,0.22)' },
  red1:   { primary: '#D9342A', soft: '#FBE0DE', mid: '#EFB1AC', ink: '#5C0A06', ring: 'rgba(217,52,42,0.22)' },
  red2:   { primary: '#9C0F1B', soft: '#F5CFCF', mid: '#DC8C8C', ink: '#3F0307', ring: 'rgba(156,15,27,0.28)' },
};

// Helpers used across components — group orange and red bands
const isAlertKey = (k) => k === 'alert1' || k === 'alert2';
const isRedKey   = (k) => k === 'red1'   || k === 'red2';
const isUrgentKey = isRedKey;
const zoneOf = (k) => k === 'ok' ? 'ok' : isAlertKey(k) ? 'alert' : 'red';

// ─────── Live temperature simulation ──────────────────────────────────────
function useSimulation(scenarioKey) {
  const [tempHistory, setTempHistory] = React.useState(() => {
    // 10 minutes at 1 sample / 5 sec = 120 points
    const pts = 120;
    const base = SCENARIOS[scenarioKey].baseTemp;
    return Array.from({ length: pts }, (_, i) => ({
      t: i, v: base - 4 + Math.sin(i / 7) * 0.6 + (Math.random() - 0.5) * 0.2,
    }));
  });
  const [liveTemp, setLiveTemp] = React.useState(SCENARIOS[scenarioKey].baseTemp);
  const [liveRate, setLiveRate] = React.useState(SCENARIOS[scenarioKey].rate);
  const targetRateRef = React.useRef(SCENARIOS[scenarioKey].rate);
  const tickRef = React.useRef(0);

  // scenario change: retarget rate smoothly
  React.useEffect(() => {
    targetRateRef.current = SCENARIOS[scenarioKey].rate;
  }, [scenarioKey]);

  // Plateau temps — where each scenario's battery eventually stabilises
  const PLATEAU = { ok: 32, alert1: 60, alert2: 78, red1: 110, red2: 140 };

  React.useEffect(() => {
    const iv = setInterval(() => {
      const plateau = PLATEAU[scenarioKey];
      // When temp approaches the plateau, ease the TARGET rate toward 0.
      // headroom 1.0 = far from plateau (full rate); 0 = at plateau (no rise).
      const headroom = Math.max(0, Math.min(1, (plateau - liveTemp) / 2));
      // Past 95% of plateau, force rate all the way to 0 (true steady state)
      const effectiveTarget = headroom < 0.05 ? 0 : SCENARIOS[scenarioKey].rate * headroom;

      setLiveRate(prev => {
        const next = prev + (effectiveTarget - prev) * 0.15; // ease to target
        // snap tiny residuals to 0 so display reads 0.00
        return Math.abs(next) < 0.01 && effectiveTarget === 0 ? 0 : next;
      });
      setLiveTemp(prev => {
        // Noise scales with rate so slow states stay visibly trending
        const noise = (Math.random() - 0.5) * Math.max(0.005, liveRate / 60 * 0.3);
        const delta = (liveRate / 60) + noise; // °C per second
        let next = prev + delta;
        // hard cap at plateau
        next = Math.min(next, plateau);
        // drift down if switched back to a calmer scenario
        if (scenarioKey === 'ok' && prev > plateau) next = prev - 0.2;
        if (isAlertKey(scenarioKey) && prev > plateau) next = prev - 0.3;
        return next;
      });
      setTempHistory(h => {
        tickRef.current += 1;
        // Push to graph only every 5 ticks → 10 min window across 120 points
        if (tickRef.current % 5 !== 0) return h;
        const next = [...h.slice(1), { t: (h[h.length - 1]?.t ?? 0) + 1, v: liveTemp }];
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [liveTemp, liveRate, scenarioKey]);

  return { liveTemp, liveRate, tempHistory };
}

// ─────── Sparkline / graph ────────────────────────────────────────────────
function TempGraph({ history, scenarioKey, dark = false }) {
  const W = 340, H = 150, P = 12;
  if (!history.length) return null;
  const values = history.map(p => p.v);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 2;
  const range = max - min || 1;
  const xs = (i) => P + (i / (history.length - 1)) * (W - P * 2);
  const ys = (v) => P + (1 - (v - min) / range) * (H - P * 2);
  const d = history.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(p.v).toFixed(1)}`).join(' ');
  const area = `${d} L${xs(history.length - 1).toFixed(1)},${H - P} L${xs(0).toFixed(1)},${H - P} Z`;
  const c = COLOURS[scenarioKey];
  const grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const labelC = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  // horizontal threshold line at 70°C if within range
  const thresholdY = (70 >= min && 70 <= max) ? ys(70) : null;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${scenarioKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.primary} stopOpacity="0.28" />
          <stop offset="100%" stopColor={c.primary} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line key={i} x1={P} x2={W - P} y1={P + f * (H - P * 2)} y2={P + f * (H - P * 2)} stroke={grid} strokeWidth="1" strokeDasharray="2 4" />
      ))}
      {/* 70°C threshold */}
      {thresholdY !== null && (
        <g>
          <line x1={P} x2={W - P} y1={thresholdY} y2={thresholdY} stroke="#C8102E" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
          <text x={W - P - 4} y={thresholdY - 4} textAnchor="end" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#C8102E" fontWeight="600">70°C</text>
        </g>
      )}
      <path d={area} fill={`url(#grad-${scenarioKey})`} />
      <path d={d} stroke={c.primary} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* current point */}
      <circle cx={xs(history.length - 1)} cy={ys(history[history.length - 1].v)} r="4" fill={c.primary} />
      <circle cx={xs(history.length - 1)} cy={ys(history[history.length - 1].v)} r="7" fill={c.primary} opacity="0.25">
        <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* x axis labels */}
      <text x={P} y={H - 2} fontSize="9" fontFamily="JetBrains Mono, monospace" fill={labelC}>-10 min</text>
      <text x={W - P} y={H - 2} textAnchor="end" fontSize="9" fontFamily="JetBrains Mono, monospace" fill={labelC}>now</text>
    </svg>
  );
}

// ─────── Data flow: Sensor → Network → App ───────────────────────────────
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
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '0 8px', marginTop: -12 }}>
        <Dot delay={0} /><Dot delay={0.2} /><Dot delay={0.4} />
      </div>
      <Node label="Network">
        <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 7.5c4-4 10-4 14 0M4.5 10c2.5-2.5 6.5-2.5 9 0M9 12.5v0" stroke={c.primary} strokeWidth="1.5" fill="none" strokeLinecap="round"/><circle cx="9" cy="12.5" r="1" fill={c.primary}/></svg>
      </Node>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '0 8px', marginTop: -12 }}>
        <Dot delay={0.6} /><Dot delay={0.8} /><Dot delay={1.0} />
      </div>
      <Node label="App">
        <svg width="18" height="18" viewBox="0 0 18 18"><rect x="4.5" y="2" width="9" height="14" rx="2" fill="none" stroke={c.primary} strokeWidth="1.5"/><circle cx="9" cy="13.5" r="0.8" fill={c.primary}/></svg>
      </Node>
    </div>
  );
}

// ─────── Home status screen ──────────────────────────────────────────────
function HomeScreen({ scenarioKey, liveTemp, liveRate, history, onBack, sensorName, sensorRoom }) {
  const s = SCENARIOS[scenarioKey];
  const c = COLOURS[scenarioKey];
  // Adapt OK copy to stable vs warming phase
  const isStable = scenarioKey === 'ok' && liveRate <= 0.03;
  const headline = isStable ? 'Battery is stable.' : s.headline;
  const sub = isStable ? 'Temperature has settled. The sensor is still watching.' : s.sub;
  const detect = isStable ? 'Temperature has plateaued. Rate of change is effectively zero.' : s.detect;
  const matters = isStable ? 'A stable temperature during or after charging is exactly what we want to see.' : s.matters;
  const [learnOpen, setLearnOpen] = React.useState(false);

  return (
    <div style={{
      background: `linear-gradient(180deg, ${c.soft} 0%, #F7F5F1 60%)`,
      transition: 'background 0.8s ease',
      padding: '32px 16px 24px',
      position: 'relative',
    }}>
      {/* Back button — top left */}
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

      {/* Live chip — top right */}
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
      <div style={{ padding: '26px 0px 10px' }}>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.6, textTransform: 'uppercase' }}>Monitoring</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#1A1A1A', letterSpacing: -0.4, marginTop: 2 }}>{sensorName || 'E-bike battery'}</div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)' }}>{sensorRoom || 'Hallway'} · Sensing Plaster #A4-91</div>
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

      {/* Actions — directly under the message, before the learn-more interpretation */}
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

      {/* Learn more — collapsible interpretation. Available on every state. */}
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

      {/* System logo */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, marginBottom: 8, opacity: 0.85, height: 28 }}>
        <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,0,0,0.4)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Powered by
        </div>
        <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="alprokon.png" alt="Alprokon" style={{ height: 28, width: 'auto', display: 'block', transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
        </div>
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

Object.assign(window, { HomeScreen, useSimulation, SCENARIOS, COLOURS, DataFlow, TempGraph, isAlertKey, isRedKey, isUrgentKey, zoneOf });
