// Sensor overview (home screen).
// User-test build: ONE battery only. The colored side-tab on the card has
// been removed — the status dot alone conveys state. Until the user enters
// a personal code, the screen shows an empty "Add a battery" card.

const SENSORS = [
  { id: 'ebike', name: 'E-bike battery', room: 'Hallway' },
];

function SensorCard({ sensor, scenarioKey, liveTemp, liveRate, onOpen }) {
  const c = COLOURS[scenarioKey];
  const t = liveTemp;
  const r = Math.max(0, liveRate);
  const pulse = scenarioKey !== 'ok';

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
        // The coloured side tab (borderLeft) has been removed per user-test
        // brief — the status dot already carries that information.
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

      <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0, marginLeft: 2 }}>
        <path d="M1 1l6 6-6 6" stroke="rgba(0,0,0,0.25)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// Empty-state "Add a battery" card shown until the user has submitted a
// personal code. Tapping it opens the code-entry sheet.
function AddSensorCard({ onAdd }) {
  return (
    <button
      onClick={onAdd}
      style={{
        width: '100%', textAlign: 'left', border: '1.5px dashed rgba(0,0,0,0.18)',
        cursor: 'pointer',
        background: 'rgba(255,255,255,0.55)',
        borderRadius: 16,
        padding: '18px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: 'Inter, system-ui',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 99,
        background: '#1A1A1A', color: '#FFF', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 400, lineHeight: 1,
      }}>+</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', letterSpacing: -0.2 }}>
          Add a battery
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.55)', marginTop: 2, lineHeight: 1.35 }}>
          Connect your sensor with your personal code.
        </div>
      </div>
    </button>
  );
}

function OverviewScreen({ scenarioKey, liveTemp, liveRate, connected, onOpen, onAdd }) {
  const c = COLOURS[scenarioKey];
  const bannerTxt =
    !connected                                              ? 'No battery connected'         :
    scenarioKey === 'ok'                                    ? 'Battery normal'                :
    (scenarioKey === 'alert1' || scenarioKey === 'alert2')  ? 'Battery needs attention'       :
                                                              'Immediate action required';

  const affectedId = SENSORS[0].id;
  // When not connected we render in a neutral palette so the screen reads as
  // "empty" rather than "everything's green".
  const bannerC = connected ? c : COLOURS.ok;

  return (
    <div style={{
      background: connected
        ? `linear-gradient(180deg, ${c.soft} 0%, #F7F5F1 40%)`
        : '#F7F5F1',
      minHeight: '100%',
      padding: '16px 16px 24px',
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

      {/* System status banner — only when there's a connected battery. When
          empty we just show the Add card; no banner clutters the screen. */}
      {connected && (
        <button
          onClick={() => scenarioKey !== 'ok' && onOpen(affectedId)}
          disabled={scenarioKey === 'ok'}
          style={{
            width: '100%', textAlign: 'left', border: 'none',
            cursor: scenarioKey === 'ok' ? 'default' : 'pointer',
            background: bannerC.primary, color: '#fff', borderRadius: 18,
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
            {scenarioKey === 'ok' ? (
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8l3.5 3.5L13 5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 2L1.5 13h13z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 6v3M8 11v0.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>{bannerTxt}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1 }}>
              {scenarioKey === 'ok' ? 'Sensor connected · updated just now' : 'Tap to see what to do'}
            </div>
          </div>
          {scenarioKey !== 'ok' && (
            <svg width="8" height="14" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>
      )}

      {/* Sensor list — one card, OR the Add card when not yet connected. */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          color: 'rgba(0,0,0,0.5)', letterSpacing: 1, textTransform: 'uppercase',
          fontWeight: 600, marginBottom: 8, paddingLeft: 4,
        }}>
          {connected ? SENSORS[0].room : 'Batteries'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {connected ? (
            <SensorCard
              sensor={SENSORS[0]}
              scenarioKey={scenarioKey}
              liveTemp={liveTemp} liveRate={liveRate}
              onOpen={onOpen}
            />
          ) : (
            <AddSensorCard onAdd={onAdd} />
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,0,0,0.4)', marginTop: 14, letterSpacing: 0.4 }}>
        {connected ? 'Sensor connected · last signal 1s ago' : 'No sensor paired yet'}
      </div>
    </div>
  );
}

Object.assign(window, { OverviewScreen, SENSORS });
