// SetupScreen — start-up scenario for Every Space Safe.
// Embeds the Vigil sensor-application 3D walkthrough (User animation.html)
// as an iframe, sized to fill the app's content area inside the phone shell.
// The walkthrough's own top progress bar + bottom controls live inside the
// iframe so they stay anchored to the animation viewport, not the phone window.

function SetupScreen({ onFinish }) {
  const wrapRef = React.useRef(null);

  return (
    <div
      data-screen-label="Setup"
      style={{
        position: 'relative',
        width: '100%',
        // Fill the visible app area above the scenario bar (~96px reserved by main shell).
        // Using 100dvh - 96 keeps the canvas exactly inside the phone interface.
        height: 'calc(100dvh - 108px)',
        background: '#F5F5F2',
        overflow: 'hidden',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }}
      ref={wrapRef}
    >
      {/* Subtle "in-app screen" header strip so the setup feels like part of
          the Every Space Safe interface, not a raw 3D viewer. */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '12px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(180deg, rgba(245,245,242,0.96) 0%, rgba(245,245,242,0) 100%)',
        zIndex: 3,
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'Inter, system-ui',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: '#1A1A1A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L4 6 v6 c0 5 3.5 8 8 10 c4.5 -2 8 -5 8 -10 V6 Z" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', letterSpacing: -0.2 }}>Set up your sensor</span>
            <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', marginTop: 2, letterSpacing: -0.05 }}>Apply the Vigil patch to your e-bike battery</span>
          </div>
        </div>
        <button
          onClick={onFinish}
          style={{
            pointerEvents: 'auto',
            border: 'none',
            background: 'rgba(0,0,0,0.06)',
            color: 'rgba(0,0,0,0.7)',
            fontSize: 11, fontWeight: 600,
            padding: '6px 10px',
            borderRadius: 99,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui',
            letterSpacing: -0.05,
          }}
        >Skip</button>
      </div>

      {/* The 3D walkthrough itself — sandboxed iframe so its window-sized layout
          (canvas + step pips + controls) sits inside the phone, not the browser. */}
      <iframe
        title="Vigil sensor application walkthrough"
        src="User animation.html?embed=1"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          background: '#F5F5F2',
        }}
      />

      {/* Soft fade at the bottom so the iframe's edge meets the scenario bar cleanly */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: 18,
        background: 'linear-gradient(180deg, rgba(245,245,242,0) 0%, rgba(245,245,242,1) 100%)',
        pointerEvents: 'none',
        zIndex: 2,
      }} />
    </div>
  );
}

Object.assign(window, { SetupScreen });
