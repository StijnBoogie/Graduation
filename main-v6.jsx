// User test build — single-scenario page, no in-app scenario switcher.
//
// Each HTML page declares its scenario via window.__ESS_SCENARIO__. The
// researcher switches the participant between pages by sending the URL of
// the target page in an NTFY notification; tapping the notification opens
// that URL in the browser. No scenario-selector UI is rendered.
//
// Cross-page graph continuity:
//   The temperature line, including its scenario-coloured segments, is
//   persisted in localStorage by useSimulation() and useAppFlow() in
//   app-v3.jsx, so navigating between scenario HTML files continues the
//   line where it left off rather than resetting.
//
// Reset:
//   Appending ?reset=1 to any URL wipes the persisted line state on page
//   load and then loads the page clean. No visible reset UI.

// Setup palette + scenario label.
COLOURS.setup = {
  primary: '#1A1A1A',
  soft:    '#F5F5F2',
  mid:     '#E3E3DD',
  ink:     '#1A1A1A',
  ring:    'rgba(26,26,26,0.18)',
};
SCENARIOS.setup = {
  key: 'setup', label: 'Setup', rate: 0.0, baseTemp: 22, name: 'SETUP',
  tone: 'First-time setup',
};

// ?reset=1 — wipe persisted state and continue with a clean page.
(function handleResetParam(){
  const u = new URL(window.location.href);
  if (u.searchParams.get('reset') === '1') {
    try {
      localStorage.removeItem('ess.line');     // graph history + segment colours
      localStorage.removeItem('ess.connected'); // personal-code submission
      localStorage.removeItem('ess.screen');
      localStorage.removeItem('ess.sensor');
    } catch (_) {}
    u.searchParams.delete('reset');
    window.history.replaceState({}, '', u.toString());
  }
})();

const FIXED_SCENARIO = window.__ESS_SCENARIO__ || 'setup';

function App() {
  const scenario = FIXED_SCENARIO;
  const isSetup = scenario === 'setup';

  // Flow:
  //   setup → onboarding animation; on finish navigate to normal.html
  //   non-setup → if not connected, show empty Home with Add button; tapping
  //     it opens the personal-code input. On submit (any input accepted),
  //     ess.connected=true and the battery card appears.
  const [connected, setConnected] = React.useState(() => {
    return localStorage.getItem('ess.connected') === '1';
  });
  const [codeOpen, setCodeOpen] = React.useState(false);
  const [code, setCode] = React.useState('');

  const [screen, setScreen] = React.useState(() => {
    if (isSetup) return 'overview';
    const stored = localStorage.getItem('ess.screen') || 'overview';
    if (stored === 'lock' && scenario === 'ok') return 'overview';
    return stored;
  });
  const [selectedSensor, setSelectedSensor] = React.useState(() => localStorage.getItem('ess.sensor') || 'ebike');

  // Simulation runs only after a battery is connected (or always for setup
  // pages — though setup never renders the graph). For unconnected non-setup
  // pages we still call useSimulation so the rising line continues to be
  // recorded even before the user enters a code — the line is the
  // researcher-driven scenario state, not the user's connection state.
  const sim = useSimulation(scenario === 'setup' ? 'ok' : scenario);

  React.useEffect(() => {
    if (!isSetup) localStorage.setItem('ess.screen', screen);
  }, [screen, isSetup]);
  React.useEffect(() => { localStorage.setItem('ess.sensor', selectedSensor); }, [selectedSensor]);
  React.useEffect(() => { localStorage.setItem('ess.connected', connected ? '1' : '0'); }, [connected]);

  const c = COLOURS[scenario];
  const currentSensor = SENSORS[0];

  const openDetail = () => {
    setSelectedSensor(currentSensor.id);
    setScreen('detail');
  };

  // Onboarding done → go to the Home Screen (this app on normal.html). The
  // Home Screen will be empty (no battery) until the user enters their code.
  const finishSetup = () => { window.location.href = 'normal.html'; };

  const submitCode = () => {
    // Accept any input — no validation.
    setConnected(true);
    setCodeOpen(false);
    setCode('');
  };

  const pageBg =
    screen === 'lock' ? '#000' :
    isSetup ? '#F5F5F2' :
    c.soft;

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      background: pageBg,
      transition: 'background 0.6s ease',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overscrollBehavior: 'none',
    }}>
      {/* Top-bar Alprokon brand. Hidden on lockscreen + setup so they keep
          their immersive full-bleed presentation. */}
      {!isSetup && screen !== 'lock' && <AlprokonHeader />}

      <div style={{
        flex: '1 1 auto',
        overflowY: isSetup ? 'hidden' : 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingTop: isSetup ? 0 : 0,
        paddingBottom: isSetup ? 0 : 'env(safe-area-inset-bottom, 0px)',
      }}>
        {isSetup ? (
          <SetupScreen onFinish={finishSetup} />
        ) : screen === 'lock' && scenario !== 'ok' ? (
          <LockScreen scenarioKey={scenario} onOpen={() => { setSelectedSensor(currentSensor.id); setScreen('detail'); }} />
        ) : screen === 'detail' && connected ? (
          <HomeScreen
            scenarioKey={scenario}
            liveTemp={sim.liveTemp}
            liveRate={sim.liveRate}
            history={sim.tempHistory}
            sensorName={currentSensor.name}
            sensorRoom={currentSensor.room}
            onBack={() => setScreen('overview')}
          />
        ) : (
          <OverviewScreen
            scenarioKey={scenario}
            liveTemp={sim.liveTemp}
            liveRate={sim.liveRate}
            connected={connected}
            onOpen={openDetail}
            onAdd={() => setCodeOpen(true)}
          />
        )}
      </div>

      {codeOpen && (
        <CodeEntry
          value={code}
          onChange={setCode}
          onCancel={() => { setCodeOpen(false); setCode(''); }}
          onSubmit={submitCode}
        />
      )}
    </div>
  );
}

// ─────── Top-bar Alprokon header ─────────────────────────────────────────
// Persistent brand bar at the top of every in-app screen.
function AlprokonHeader() {
  return (
    <div style={{
      paddingTop: 'env(safe-area-inset-top, 0px)',
      background: 'rgba(255,255,255,0.78)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      position: 'sticky',
      top: 0, zIndex: 50,
    }}>
      <div style={{
        height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}>
        <img
          src="Alprokon.png"
          alt="Alprokon"
          style={{ height: 22, width: 'auto', display: 'block' }}
        />
      </div>
    </div>
  );
}

// ─────── Personal-code entry sheet ───────────────────────────────────────
function CodeEntry({ value, onChange, onCancel, onSubmit }) {
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    // Autofocus on open
    const id = setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,10,10,0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: '#FFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '20px 22px calc(env(safe-area-inset-bottom, 0px) + 22px)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
          fontFamily: 'Inter, system-ui',
        }}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)',
          margin: '0 auto 16px',
        }} />
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(0,0,0,0.5)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
          Connect your sensor
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3, color: '#1A1A1A', marginBottom: 6 }}>
          Enter your personal code
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(0,0,0,0.55)', lineHeight: 1.4, marginBottom: 18 }}>
          You'll find this code on the packaging of your Vigil sensor.
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. A4-91-XK"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#F7F5F1',
              fontSize: 18,
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 1.2,
              color: '#1A1A1A',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '13px 0',
                borderRadius: 14, border: 'none',
                background: 'rgba(0,0,0,0.06)',
                color: '#1A1A1A',
                fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui',
              }}
            >Cancel</button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '13px 0',
                borderRadius: 14, border: 'none',
                background: '#1A1A1A',
                color: '#FFF',
                fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui',
              }}
            >Connect</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────── Moderator scenario switcher ─────────────────────────────────────
// A small floating dot in the bottom-right corner. Tapping expands a tiny
// menu of scenario links. This is for the researcher only — visually
// minimal so the participant doesn't read it as part of the app UI.
// Navigates to the target scenario page WITHOUT resetting the graph state
// (no ?reset=1), so colour transitions and the persistent line can be
// observed across switches just like a real NTFY-driven jump.
const MOD_SCENARIO_LINKS = {
  ok:     { href: 'normal.html',  label: 'Normal',   colour: '#0F7A3E' },
  alert1: { href: 'orange1.html', label: 'Orange 1', colour: '#E89A33' },
  alert2: { href: 'orange2.html', label: 'Orange 2', colour: '#C77700' },
  red1:   { href: 'red1.html',    label: 'Red 1',    colour: '#D9342A' },
  red2:   { href: 'red2.html',    label: 'Red 2',    colour: '#9C0F1B' },
};
const MOD_SCENARIO_ORDER = ['ok', 'alert1', 'alert2', 'red1', 'red2'];

function ModeratorSwitcher() {
  const [open, setOpen] = React.useState(false);
  const current = window.__ESS_SCENARIO__ || 'ok';

  // Navigate hard, not via React Router or anchor default — the participant
  // experience of an NTFY notification tap is a full page navigation, and
  // we want the moderator switcher to mimic that exactly so graph state
  // round-trips through localStorage the same way it would in the field.
  const navigate = (href) => {
    setOpen(false);
    window.location.href = href;
  };

  return (
    <div style={{
      position: 'fixed',
      right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      zIndex: 9999,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      {open && (
        <div style={{
          marginBottom: 8,
          background: 'rgba(20,20,22,0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 12,
          padding: 6,
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minWidth: 132,
        }}>
          <div style={{
            fontSize: 9, color: 'rgba(255,255,255,0.45)',
            letterSpacing: 1, textTransform: 'uppercase',
            padding: '4px 8px 6px', fontWeight: 600,
          }}>Moderator</div>
          {MOD_SCENARIO_ORDER.map(k => {
            const s = MOD_SCENARIO_LINKS[k];
            const active = k === current;
            return (
              <button
                key={k}
                type="button"
                onClick={() => navigate(s.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: 'none',
                  textAlign: 'left',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: active ? '#FFF' : 'rgba(255,255,255,0.78)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11, fontWeight: 600,
                  letterSpacing: 0.2,
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: 99,
                  background: s.colour, flexShrink: 0,
                  boxShadow: active ? `0 0 0 2px rgba(255,255,255,0.2)` : 'none',
                }} />
                <span style={{ flex: 1 }}>{s.label}</span>
                {active && <span style={{ fontSize: 9, opacity: 0.5 }}>now</span>}
              </button>
            );
          })}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 4px' }} />
          <button
            type="button"
            onClick={() => navigate('index.html')}
            style={{
              display: 'block', textAlign: 'left',
              width: '100%',
              padding: '6px 8px',
              borderRadius: 8, border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10.5, fontWeight: 600,
              letterSpacing: 0.2,
              cursor: 'pointer',
            }}
          >
            Setup walkthrough
          </button>
          <button
            type="button"
            onClick={() => {
              const target = (MOD_SCENARIO_LINKS[current] || MOD_SCENARIO_LINKS.ok).href;
              navigate(`${target}?reset=1`);
            }}
            style={{
              display: 'block', textAlign: 'left',
              width: '100%',
              padding: '6px 8px',
              borderRadius: 8, border: 'none',
              background: 'transparent',
              color: 'rgba(255,180,180,0.85)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10.5, fontWeight: 600,
              letterSpacing: 0.2,
              cursor: 'pointer',
            }}
          >
            Reset graph
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Moderator scenario switcher"
        title="Moderator: switch scenario"
        style={{
          width: 32, height: 32, borderRadius: 99,
          border: 'none',
          background: 'rgba(20,20,22,0.85)',
          color: '#FFF',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
          padding: 0,
        }}
      >
        {open ? '×' : 'M'}
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.Fragment>
    <App />
    {/*
      Moderator-only scenario switcher.
      Available on every page (including setup) so the researcher can
      jump between scenarios for testing. Graph state is preserved
      across navigation — a moderator switch is identical to a real
      participant tapping an NTFY notification URL.
    */}
    <ModeratorSwitcher />
  </React.Fragment>
);
