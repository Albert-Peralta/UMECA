import { useState } from 'react';
import './CuerpoSVG.css';

/* Etiquetas en español para cada ID de zona */
const LABELS = {
  // Frontal
  face:        'Cara',
  neck:        'Cuello',
  chest:       'Pecho / Torso',
  abdomen:     'Abdomen',
  pelvis:      'Pelvis / Cadera',
  u_arm_r:     'Brazo Superior Derecho',
  l_arm_r:     'Antebrazo Derecho',
  hand_r:      'Mano Derecha',
  u_arm_l:     'Brazo Superior Izquierdo',
  l_arm_l:     'Antebrazo Izquierdo',
  hand_l:      'Mano Izquierda',
  u_leg_r:     'Muslo Derecho',
  l_leg_r:     'Pierna Derecha',
  foot_r:      'Pie Derecho',
  u_leg_l:     'Muslo Izquierdo',
  l_leg_l:     'Pierna Izquierda',
  foot_l:      'Pie Izquierdo',
  // Posterior
  head_b:      'Cabeza (posterior)',
  neck_b:      'Cuello (posterior)',
  upper_back:  'Espalda Alta',
  lower_back:  'Zona Lumbar',
  glutes:      'Glúteos',
  u_arm_r_b:   'Brazo Superior Derecho (posterior)',
  l_arm_r_b:   'Antebrazo Derecho (posterior)',
  hand_r_b:    'Mano Derecha (dorso)',
  u_arm_l_b:   'Brazo Superior Izquierdo (posterior)',
  l_arm_l_b:   'Antebrazo Izquierdo (posterior)',
  hand_l_b:    'Mano Izquierda (dorso)',
  u_leg_r_b:   'Muslo Posterior Derecho',
  l_leg_r_b:   'Pantorrilla Derecha',
  sole_r:      'Planta Pie Derecho',
  u_leg_l_b:   'Muslo Posterior Izquierdo',
  l_leg_l_b:   'Pantorrilla Izquierda',
  sole_l:      'Planta Pie Izquierdo',
};

export default function CuerpoSVG({ tatuajes, setTatuajes }) {
  const [view, setView] = useState('frontal');
  const [selectedParts, setSelectedParts] = useState([]);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, label: '', sel: false });

  const handlePartClick = (partId) => {
    const label = LABELS[partId] || partId;
    setSelectedParts(prev => {
      if (prev.includes(partId)) {
        const idx = tatuajes.findIndex(t => t.parteCuerpo === label);
        if (idx !== -1) {
          const next = tatuajes.filter((_, i) => i !== idx);
          setTatuajes(next.length ? next : [{ parteCuerpo: '', descripcion: '' }]);
        }
        return prev.filter(id => id !== partId);
      } else {
        const base = tatuajes.filter(t => t.parteCuerpo || t.descripcion);
        setTatuajes([...base, { parteCuerpo: label, descripcion: '' }]);
        return [...prev, partId];
      }
    });
  };

  const isSelected = id => selectedParts.includes(id);
  const cls = id => `body-part${isSelected(id) ? ' selected' : ''}`;

  const me = (id) => ({
    onMouseEnter: e => setTooltip({ visible: true, x: e.clientX + 14, y: e.clientY - 10, label: LABELS[id] || id, sel: isSelected(id) }),
    onMouseMove:  e => setTooltip(p => ({ ...p, x: e.clientX + 14, y: e.clientY - 10 })),
    onMouseLeave: () => setTooltip(p => ({ ...p, visible: false })),
    onClick: () => handlePartClick(id),
  });

  /* ── helpers para zonas comunes ── */
  const P = (id, d) => <path key={id} d={d} className={cls(id)} {...me(id)} />;
  const E = (id, cx, cy, rx, ry) => <ellipse key={id} cx={cx} cy={cy} rx={rx} ry={ry} className={cls(id)} {...me(id)} />;
  const R = (id, x, y, w, h, rx = 0) => <rect key={id} x={x} y={y} width={w} height={h} rx={rx} className={cls(id)} {...me(id)} />;

  return (
    <div className="body-map-container">

      {/* Selector de Vista */}
      <div className="view-selector">
        <button className={`view-btn${view === 'frontal' ? ' active' : ''}`} onClick={() => setView('frontal')}>
          👤 Vista Frontal
        </button>
        <button className={`view-btn${view === 'posterior' ? ' active' : ''}`} onClick={() => setView('posterior')}>
          🔄 Vista Posterior
        </button>
      </div>

      {/* SVG */}
      <div className="svg-wrapper">
        <svg viewBox="0 0 350 660" className="body-svg" xmlns="http://www.w3.org/2000/svg">

          {/* ══════════════ VISTA FRONTAL ══════════════ */}
          {view === 'frontal' && (
            <g>
              {/* Cabeza */}
              {E('face', 175, 56, 33, 40)}

              {/* Cuello */}
              {P('neck', 'M 163,95 C 163,95 160,122 160,124 L 190,124 C 190,122 187,95 187,95 Z')}

              {/* Pecho / Torso — amplio en hombros, estrecho en cintura */}
              {P('chest', 'M 160,122 C 138,122 104,130 101,140 C 94,166 95,202 101,230 L 249,230 C 255,202 256,166 249,140 C 246,130 212,122 190,122 Z')}

              {/* Abdomen */}
              {P('abdomen', 'M 102,232 C 101,272 108,303 120,320 L 230,320 C 242,303 249,272 248,232 Z')}

              {/* Pelvis / Cadera */}
              {P('pelvis', 'M 120,322 C 111,344 115,372 142,384 L 208,384 C 235,372 239,344 230,322 Z')}

              {/* ── BRAZO SUPERIOR DERECHO ── */}
              {P('u_arm_r', 'M 98,138 C 88,150 70,190 70,228 C 70,236 90,240 98,228 C 100,205 102,168 101,142 Z')}

              {/* ── ANTEBRAZO DERECHO ── */}
              {P('l_arm_r', 'M 68,230 C 62,265 63,300 70,328 C 74,338 94,340 98,328 C 98,300 98,264 98,230 Z')}

              {/* ── MANO DERECHA ── */}
              {P('hand_r', 'M 68,330 C 58,342 60,366 74,373 L 96,373 C 110,366 112,342 102,330 Z')}

              {/* ── BRAZO SUPERIOR IZQUIERDO ── */}
              {P('u_arm_l', 'M 252,138 C 262,150 280,190 280,228 C 280,236 260,240 252,228 C 250,205 248,168 249,142 Z')}

              {/* ── ANTEBRAZO IZQUIERDO ── */}
              {P('l_arm_l', 'M 282,230 C 288,265 287,300 280,328 C 276,338 256,340 252,328 C 252,300 252,264 252,230 Z')}

              {/* ── MANO IZQUIERDA ── */}
              {P('hand_l', 'M 282,330 C 292,342 290,366 276,373 L 254,373 C 240,366 238,342 248,330 Z')}

              {/* ── MUSLO DERECHO ── */}
              {P('u_leg_r', 'M 143,386 C 132,410 126,452 132,487 C 137,502 160,505 167,490 C 169,455 167,412 164,388 Z')}

              {/* ── PIERNA DERECHA ── */}
              {P('l_leg_r', 'M 134,489 C 128,526 130,562 138,592 C 143,605 163,605 167,592 C 167,561 167,525 167,490 Z')}

              {/* ── PIE DERECHO ── */}
              {P('foot_r', 'M 138,594 C 128,614 134,638 152,644 L 178,636 C 187,625 182,600 170,594 Z')}

              {/* ── MUSLO IZQUIERDO ── */}
              {P('u_leg_l', 'M 207,386 C 218,410 224,452 218,487 C 213,502 190,505 183,490 C 181,455 183,412 186,388 Z')}

              {/* ── PIERNA IZQUIERDA ── */}
              {P('l_leg_l', 'M 216,489 C 222,526 220,562 212,592 C 207,605 187,605 183,592 C 183,561 183,525 183,490 Z')}

              {/* ── PIE IZQUIERDO ── */}
              {P('foot_l', 'M 212,594 C 222,614 216,638 198,644 L 172,636 C 163,625 168,600 180,594 Z')}
            </g>
          )}

          {/* ══════════════ VISTA POSTERIOR ══════════════ */}
          {view === 'posterior' && (
            <g>
              {/* Cabeza (posterior) */}
              {E('head_b', 175, 56, 33, 40)}

              {/* Cuello (posterior) */}
              {P('neck_b', 'M 163,95 C 163,95 160,122 160,124 L 190,124 C 190,122 187,95 187,95 Z')}

              {/* Espalda Alta */}
              {P('upper_back', 'M 160,122 C 138,122 104,130 101,140 C 94,166 95,200 101,228 L 249,228 C 255,200 256,166 249,140 C 246,130 212,122 190,122 Z')}

              {/* Zona Lumbar */}
              {P('lower_back', 'M 102,230 C 101,268 107,298 118,315 L 232,315 C 243,298 249,268 248,230 Z')}

              {/* Glúteos */}
              {P('glutes', 'M 118,317 C 109,340 113,370 140,382 L 210,382 C 237,370 241,340 232,317 Z')}

              {/* ── BRAZO SUPERIOR DERECHO (posterior) ── */}
              {P('u_arm_r_b', 'M 98,138 C 88,150 70,190 70,228 C 70,236 90,240 98,228 C 100,205 102,168 101,142 Z')}

              {/* ── ANTEBRAZO DERECHO (posterior) ── */}
              {P('l_arm_r_b', 'M 68,230 C 62,265 63,300 70,328 C 74,338 94,340 98,328 C 98,300 98,264 98,230 Z')}

              {/* ── MANO DERECHA (dorso) ── */}
              {P('hand_r_b', 'M 68,330 C 58,342 60,366 74,373 L 96,373 C 110,366 112,342 102,330 Z')}

              {/* ── BRAZO SUPERIOR IZQUIERDO (posterior) ── */}
              {P('u_arm_l_b', 'M 252,138 C 262,150 280,190 280,228 C 280,236 260,240 252,228 C 250,205 248,168 249,142 Z')}

              {/* ── ANTEBRAZO IZQUIERDO (posterior) ── */}
              {P('l_arm_l_b', 'M 282,230 C 288,265 287,300 280,328 C 276,338 256,340 252,328 C 252,300 252,264 252,230 Z')}

              {/* ── MANO IZQUIERDA (dorso) ── */}
              {P('hand_l_b', 'M 282,330 C 292,342 290,366 276,373 L 254,373 C 240,366 238,342 248,330 Z')}

              {/* ── MUSLO POSTERIOR DERECHO ── */}
              {P('u_leg_r_b', 'M 143,384 C 132,408 126,450 132,485 C 137,500 160,503 167,488 C 169,453 167,410 164,386 Z')}

              {/* ── PANTORRILLA DERECHA ── */}
              {P('l_leg_r_b', 'M 134,487 C 128,524 130,560 138,590 C 143,603 163,603 167,590 C 167,559 167,523 167,488 Z')}

              {/* ── PLANTA PIE DERECHO ── */}
              {P('sole_r', 'M 138,592 C 128,612 134,636 152,642 L 178,634 C 187,623 182,598 170,592 Z')}

              {/* ── MUSLO POSTERIOR IZQUIERDO ── */}
              {P('u_leg_l_b', 'M 207,384 C 218,408 224,450 218,485 C 213,500 190,503 183,488 C 181,453 183,410 186,386 Z')}

              {/* ── PANTORRILLA IZQUIERDA ── */}
              {P('l_leg_l_b', 'M 216,487 C 222,524 220,560 212,590 C 207,603 187,603 183,590 C 183,559 183,523 183,488 Z')}

              {/* ── PLANTA PIE IZQUIERDO ── */}
              {P('sole_l', 'M 212,592 C 222,612 216,636 198,642 L 172,634 C 163,623 168,598 180,592 Z')}
            </g>
          )}

        </svg>
      </div>

      <p className="instruction-text">
        📍 Haz clic en una zona para seleccionarla. Vuelve a hacer clic para quitarla.
      </p>

      {/* Tags con botón × */}
      {selectedParts.length > 0 && (
        <div className="cuerpo-sel-tags">
          {selectedParts.map(id => (
            <span key={id} className="cuerpo-sel-tag">
              {LABELS[id] || id}
              <button onClick={() => handlePartClick(id)} title="Quitar">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Tooltip flotante */}
      {tooltip.visible && (
        <div className="cuerpo-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.sel
            ? <><i className="bi bi-dash-circle-fill" style={{ color: '#f87171' }} /> Quitar: {tooltip.label}</>
            : <><i className="bi bi-plus-circle-fill" style={{ color: '#4caf50' }} /> {tooltip.label}</>
          }
        </div>
      )}
    </div>
  );
}
