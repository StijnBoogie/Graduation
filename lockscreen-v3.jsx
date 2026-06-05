// Lock screen mock — passive notification for orange, urgent push (sound +
// vibration) for red. v3: 5-state model.

function LockScreen({ scenarioKey, onOpen }) {
  const c = COLOURS[scenarioKey];
  const urgent = isRedKey(scenarioKey);
  const title =
    scenarioKey === 'alert1' ? 'Battery is heating — observe it'        :
    scenarioKey === 'alert2' ? 'Battery is no longer safe — remove it'  :
    scenarioKey === 'red1'   ? 'URGENT — unplug and remove your battery':
                               'IMMINENT DANGER — remove the battery now';
  const body =
    scenarioKey === 'alert1' ? 'E-bike battery is rising above the normal range. Unplug, do not move. Stay nearby and watch.' :
    scenarioKey === 'alert2' ? 'E-bike battery is still climbing. Unplug if connected and take it out of the room.'             :
    scenarioKey === 'red1'   ? 'Temperature is rising rapidly. Unplug, remove from the room, take it outside — now.'           :
                               'Thermal runaway is developing. Move it outside or evacuate and call 112.';

  // Pretend "now" date
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);
  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `
        radial-gradient(ellipse at 50% 0%, ${c.soft} 0%, transparent 55%),
        linear-gradient(180deg, #1a1f26 0%, #0b0e12 100%)
      `,
      color: '#fff', position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* time */}
      <div style={{ paddingTop: 78, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 500, opacity: 0.85, letterSpacing: 0.2 }}>{dateStr}</div>
        <div style={{ fontSize: 86, fontWeight: 200, letterSpacing: -2, marginTop: 4, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {hh}:{mm}
        </div>
      </div>

      {/* Notification stack */}
      <div style={{ padding: '40px 12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onOpen}
          style={{
            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
            background: urgent
              ? `linear-gradient(135deg, ${c.primary} 0%, ${c.ink} 110%)`
              : 'rgba(28,28,32,0.78)',
            backdropFilter: 'blur(26px) saturate(180%)',
            WebkitBackdropFilter: 'blur(26px) saturate(180%)',
            borderRadius: 18, padding: '12px 14px', color: '#fff',
            boxShadow: urgent
              ? `0 10px 30px ${c.ring}, 0 0 0 1px ${c.ring}`
              : '0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
            animation: urgent ? 'esBuzz 0.8s infinite' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 9, flexShrink: 0,
              background: urgent ? 'rgba(255,255,255,0.15)' : c.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* flame / shield glyph */}
              <svg width="22" height="22" viewBox="0 0 22 22">
                <path d="M11 2.5s4 3 4 7.5a4 4 0 11-8 0c0-1.2.5-2 1.2-2.7-.2 1.2.5 2 1.3 2 .8 0 1.3-.6 1.3-1.5 0-1.8 0-3.5.2-5.3z" fill="#fff"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, opacity: 0.85 }}>EVERY SPACE SAFE</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>now</div>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 2, lineHeight: 1.25, letterSpacing: -0.1 }}>
                {urgent && <span style={{ marginRight: 6 }}>⚠</span>}{title}
              </div>
              <div style={{ fontSize: 13.5, marginTop: 2, opacity: 0.88, lineHeight: 1.3 }}>{body}</div>
            </div>
          </div>
          {urgent && (
            <div style={{
              marginTop: 10, padding: '8px 10px',
              background: 'rgba(255,255,255,0.14)', borderRadius: 10,
              fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              letterSpacing: 0.3,
            }}>
              <span>🔊 Sound · Vibration</span>
              <span style={{ opacity: 0.7 }}>Tap to open →</span>
            </div>
          )}
        </button>

        {/* supplementary notification (older) */}
        {isRedKey(scenarioKey) && (
          <div style={{
            background: 'rgba(28,28,32,0.6)', backdropFilter: 'blur(26px) saturate(180%)',
            WebkitBackdropFilter: 'blur(26px) saturate(180%)',
            borderRadius: 18, padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)', opacity: 0.85,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, opacity: 0.8 }}>EVERY SPACE SAFE · 2 min ago</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>Battery temperature rising — we are watching it.</div>
          </div>
        )}
      </div>

      {/* bottom instruction */}
      <div style={{
        position: 'absolute', bottom: 44, left: 0, right: 0, textAlign: 'center',
        fontSize: 12, opacity: 0.55, letterSpacing: 0.3,
      }}>
        {urgent ? 'Slide notification to open instantly' : 'Tap notification to open Every Space Safe'}
      </div>
    </div>
  );
}

Object.assign(window, { LockScreen });
