// Main app shell v6 — multi-page edition.
// Each HTML file declares its own fixed scenario via window.__ESS_SCENARIO__.
// The scenario chip row navigates between HTML files instead of mutating
// React state, so each scenario can be linked / deep-linked as a GitHub Pages
// page on its own. Screen state (overview / detail / lock) and selected sensor
// continue to live in localStorage, so they survive navigation.

const SCENARIO_LINKS = {
  setup:  'index.html',
  ok:     'normal.html',
  alert1: 'orange1.html',
  alert2: 'orange2.html',
  red1:   'red1.html',
  red2:   'red2.html',
};
const SCENARIO_ORDER = ['setup', 'ok', 'alert1', 'alert2', 'red1', 'red2'];

// Setup palette + scenario label (same as v5 — additive to the shared tokens).
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

// The scenario for THIS page is fixed at load. The user changes scenarios by
// navigating to a different HTML file via the chip row.
const FIXED_SCENARIO = window.__ESS_SCENARIO__ || 'setup';

function navigateToScenario(k) {
  if (k === FIXED_SCENARIO) return;
  const href = SCENARIO_LINKS[k];
  if (href) window.location.href = href;
}

function App() {
  const scenario = FIXED_SCENARIO;
  // Screen + sensor selection survive cross-page navigation through localStorage.
  // Setup is special: it always shows the walkthrough — no overview/detail/lock under it.
  const [screen, setScreen] = React.useState(() => {
    if (scenario === 'setup') return 'overview';
    const stored = localStorage.getItem('ess.screen') || 'overview';
    // Lock screen only valid for non-ok pages.
    if (stored === 'lock' && scenario === 'ok') return 'overview';
    return stored;
  });
  const [selectedSensor, setSelectedSensor] = React.useState(() => localStorage.getItem('ess.sensor') || 'ebike');

  const sim = useSimulation(scenario === 'setup' ? 'ok' : scenario);

  React.useEffect(() => { if (scenario !== 'setup') localStorage.setItem('ess.screen', screen); }, [screen, scenario]);
  React.useEffect(() => { localStorage.setItem('ess.sensor', selectedSensor); }, [selectedSensor]);

  const c = COLOURS[scenario];
  const currentSensor = SENSORS.find(s => s.id === selectedSensor) || SENSORS[0];

  const openDetail = (id) => {
    setSelectedSensor(id);
    setScreen('detail');
  };

  // Skip / finish setup → land on normal.html
  const finishSetup = () => { window.location.href = 'normal.html'; };

  const pageBg =
    screen === 'lock' ? '#000' :
    scenario === 'setup' ? '#F5F5F2' :
    c.soft;

  const isSetup = scenario === 'setup';

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
      <div style={{
        flex: '1 1 auto',
        overflowY: isSetup ? 'hidden' : 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingTop: isSetup ? 0 : 'env(safe-area-inset-top, 0px)',
        paddingBottom: isSetup ? 0 : 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      }}>
        {isSetup ? (
          <SetupScreen onFinish={finishSetup} />
        ) : screen === 'lock' && scenario !== 'ok' ? (
          <LockScreen scenarioKey={scenario} onOpen={() => { setSelectedSensor('ebike'); setScreen('detail'); }} />
        ) : screen === 'detail' ? (
          (() => {
            const isEbike = selectedSensor === 'ebike';
            const detailScenario = isEbike ? scenario : 'ok';
            const detailTemp  = isEbike ? sim.liveTemp : (selectedSensor === 'escoot' ? 21.4 : 23.2);
            const detailRate  = isEbike ? sim.liveRate : (selectedSensor === 'escoot' ? 0.00 : 0.01);
            const detailHist  = isEbike ? sim.tempHistory : Array.from({length: 60}, () => detailTemp);
            return (
              <HomeScreen
                scenarioKey={detailScenario}
                liveTemp={detailTemp}
                liveRate={detailRate}
                history={detailHist}
                sensorName={currentSensor.name}
                sensorRoom={currentSensor.room}
                onBack={() => setScreen('overview')}
              />
            );
          })()
        ) : (
          <OverviewScreen
            scenarioKey={scenario}
            liveTemp={sim.liveTemp}
            liveRate={sim.liveRate}
            onOpen={openDetail}
          />
        )}
      </div>

      <ScenarioBar
        scenario={scenario}
        screen={screen}
        onScreenChange={setScreen}
      />
    </div>
  );
}

// ─────── In-app scenario switcher ───────────────────────────────────────
// Scenario chips are now navigation links (anchors) — clicking jumps to the
// scenario's HTML file. Screen toggles still mutate local state.
function ScenarioBar({ scenario, screen, onScreenChange }) {
  const isSetup = scenario === 'setup';
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: 'linear-gradient(180deg, rgba(247,245,241,0) 0%, rgba(247,245,241,0.95) 40%)',
      pointerEvents: 'none',
      zIndex: 1000,
    }}>
      <div style={{
        margin: '0 12px 12px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 22,
        boxShadow: '0 6px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)',
        padding: 8,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {/* Scenario chips — anchors to other pages */}
        <div style={{
          display: 'flex', gap: 3, alignItems: 'stretch', justifyContent: 'space-between',
        }}>
          {SCENARIO_ORDER.map(k => {
            const col = COLOURS[k];
            const active = scenario === k;
            return (
              <a
                key={k}
                href={SCENARIO_LINKS[k]}
                onClick={(e) => { e.preventDefault(); navigateToScenario(k); }}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  padding: '10px 2px',
                  textDecoration: 'none',
                  border: 'none', borderRadius: 14,
                  background: active ? col.primary : 'transparent',
                  color: active ? '#fff' : '#1A1A1A',
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 3,
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: 99,
                  background: active ? '#fff' : col.primary,
                  boxShadow: active ? 'none' : `0 0 0 2px ${col.soft}`,
                }} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: -0.1 }}>{SCENARIOS[k].label}</span>
              </a>
            );
          })}
        </div>

        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 4px' }} />

        {/* Screen toggle — disabled while in setup */}
        <div style={{ display: 'flex', gap: 4, padding: '0 2px 2px' }}>
          <ScreenBtn label="Overview" active={screen === 'overview' && !isSetup} disabled={isSetup} onClick={() => !isSetup && onScreenChange('overview')} />
          <ScreenBtn label="Detail"   active={screen === 'detail'   && !isSetup} disabled={isSetup} onClick={() => !isSetup && onScreenChange('detail')} />
          <ScreenBtn
            label="Lock screen"
            active={screen === 'lock' && !isSetup}
            disabled={isSetup || scenario === 'ok'}
            onClick={() => !isSetup && scenario !== 'ok' && onScreenChange('lock')}
          />
        </div>
      </div>
    </div>
  );
}

function ScreenBtn({ label, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1,
      padding: '8px 0',
      border: 'none', borderRadius: 10,
      background: active ? '#1A1A1A' : 'transparent',
      color: active ? '#fff' : disabled ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.65)',
      fontSize: 12, fontWeight: 600, letterSpacing: -0.1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'Inter, system-ui',
      transition: 'background 0.2s, color 0.2s',
    }}>{label}</button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
