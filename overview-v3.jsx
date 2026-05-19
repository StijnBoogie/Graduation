// Sensor overview (home screen) — room-grouped list of all sensors

// Three sensors in the home. Each one follows the active scenario so the
// whole app reflects a single state.
const SENSORS = [
  { id: 'ebike',   name: 'E-bike battery',      room: 'Hallway' },
  { id: 'escoot',  name: 'E-scooter battery',   room: 'Garage'  },
  { id: 'tool',    name: 'Fatbike battery',     room: 'Shed'    },
];

// Only the E-bike battery reflects the active scenario. The other two sensors
// are always in 'ok' and show calm, baseline values — a light jitter keeps them
// from looking identical.
function sensorScenario(sensorId, scenarioKey) {
  return sensorId === 'ebike' ? scenarioKey : 'ok';
}
function sensorSample(sensorId, scenarioKey, liveTemp, liveRate) {
  if (sensorId === 'ebike') return { t: liveTemp, r: Math.max(0, liveRate) };
  // Calm baseline for the other sensors (ambient, effectively stable).
  if (sensorId === 'escoot') return { t: 21.4, r: 0.00 };
  return { t: 23.2, r: 0.01 }; // tool
}

function SensorCard({ sensor, scenarioKey, liveTemp, liveRate, onOpen }) {
  // Per-sensor state: only e-bike follows the active scenario.
  const sKey = sensorScenario(sensor.id, scenarioKey);
  const c = COLOURS[sKey];
  const { t, r } = sensorSample(sensor.id, scenarioKey, liveTemp, liveRate);
  const pulse = sKey !== 'ok';

  // Trend: steady (dot) · rising (↑) · falling (–)
  // Rate is always ≥0 in this sim; we treat very small rates as steady,
  // and (if a sensor ever cools) a negative rate shows as a dash.
  let trend = 'steady';
  if (r > 0.08) trend = 'rising';
  else if (r < -0.05) trend = 'falling';

  const arrow = {
    steady:  <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="2.2" fill={c.primary}/></svg>,
    rising:  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" stroke={c.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    falling: <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8" stroke={c.primary} strokeWidth="2" strokeLinecap="round"/></svg>,
  }[trend];

  return (
    <button
      onClick={() => onOpen(sensor.id)}
      style={{
        width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
        background: 'rgba(255,255,255,0.85)',
        borderLeft: `3px solid ${c.primary}`,
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)',
        animation: pulse ? 'esCardPulse 2.2s ease-in-out infinite' : 'none',
        fontFamily: 'Inter, system-ui',
      }}
    >
      {/* Status dot */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <span style={{ width: 12, height: 12, borderRadius: 99, background: c.primary, display: 'block' }} />
        {pulse && (
          <span style={{
            position: 'absolute', inset: -4, borderRadius: 99,
            background: c.primary, opacity: 0.3,
            animation: 'esPulse 1.6s infinite',
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', letterSpacing: -0.2 }}>
          {sensor.name}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 1 }}>
          {sensor.room}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600,
          color: c.ink, letterSpacing: -0.3, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {t.toFixed(1)}<span style={{ fontSize: 11, color: c.primary, marginLeft: 1 }}>°C</span>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: c.primary, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {arrow}
          {r.toFixed(2)} °C/min
        </div>
      </div>

      {/* chevron */}
      <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0, marginLeft: 2 }}>
        <path d="M1 1l6 6-6 6" stroke="rgba(0,0,0,0.25)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function OverviewScreen({ scenarioKey, liveTemp, liveRate, onOpen }) {
  const c = COLOURS[scenarioKey];
  const bannerTxt =
    scenarioKey === 'ok'                                  ? 'All batteries normal' :
    (scenarioKey === 'alert1' || scenarioKey === 'alert2') ? '1 battery needs attention' :
                                                             'Immediate action required';

  // Affected sensor index (first non-ok). For this prototype scenario
  // drives all sensors — pick the first card as the representative.
  const affectedId = SENSORS[0].id;

  // Group by room
  const byRoom = SENSORS.reduce((acc, s, i) => {
    (acc[s.room] = acc[s.room] || []).push({ ...s, idx: i });
    return acc;
  }, {});

  return (
    <div style={{
      background: `linear-gradient(180deg, ${c.soft} 0%, #F7F5F1 40%)`,
      minHeight: '100%',
      padding: '32px 16px 12px',
      transition: 'background 0.8s ease',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 16, paddingTop: 4 }}>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.6, textTransform: 'uppercase' }}>
          My home
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', letterSpacing: -0.6, marginTop: 2 }}>
          Every Space Safe
        </div>
      </div>

      {/* System status banner */}
      <button
        onClick={() => scenarioKey !== 'ok' && onOpen(affectedId)}
        disabled={scenarioKey === 'ok'}
        style={{
          width: '100%', textAlign: 'left', border: 'none',
          cursor: scenarioKey === 'ok' ? 'default' : 'pointer',
          background: c.primary, color: '#fff', borderRadius: 18,
          padding: '14px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
          animation: isRedKey(scenarioKey) ? 'esBuzz 0.8s infinite' : 'none',
          fontFamily: 'Inter, system-ui',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 99,
          background: 'rgba(255,255,255,0.2)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {scenarioKey === 'ok' && (
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8l3.5 3.5L13 5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
          {scenarioKey !== 'ok' && (
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 2L1.5 13h13z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 6v3M8 11v0.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>{bannerTxt}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1 }}>
            {scenarioKey === 'ok'
              ? `${SENSORS.length} sensors connected · updated just now`
              : 'Tap to see what to do'}
          </div>
        </div>
        {scenarioKey !== 'ok' && (
          <svg width="8" height="14" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
      </button>

      {/* Room groups */}
      {Object.entries(byRoom).map(([room, sensors]) => (
        <div key={room} style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
            color: 'rgba(0,0,0,0.5)', letterSpacing: 1, textTransform: 'uppercase',
            fontWeight: 600, marginBottom: 8, paddingLeft: 4,
          }}>
            {room}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sensors.map(s => (
              <SensorCard
                key={s.id} sensor={s}
                scenarioKey={scenarioKey}
                liveTemp={liveTemp} liveRate={liveRate}
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'center', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,0,0,0.4)', marginTop: 14, letterSpacing: 0.4 }}>
        All sensors connected · last signal 1s ago
      </div>

      {/* System logo */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '44px 0px 8px', opacity: 0.85, height: 28 }}>
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

Object.assign(window, { OverviewScreen, SENSORS });
