import { useState, useEffect, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, ArcElement,
    Title, Tooltip, Legend, LineElement, PointElement, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getEstadisticas, exportarEstadisticasExcel } from '../api/estadisticasApi';
import { getConsultas } from '../api/consultasApi';
import { getEstadisticasCorrespondencia } from '../api/correspondenciaApi';
import { getReporteConsolidado, TIPOS_ACTIVIDAD } from '../api/seguimientosApi';
import { getConsolidado as getConsolidadoRD } from '../api/reporteDiarioApi';
import './Estadisticas.css';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, ArcElement,
    Title, Tooltip, Legend, LineElement, PointElement, Filler,
    ChartDataLabels
);

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_FULL = ['Todos','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const porMes = (rows) => {
    const arr = Array(12).fill(0);
    (rows || []).forEach(([mes, cnt]) => { arr[mes - 1] = Number(cnt); });
    return arr;
};

// ── Paleta por sección ──────────────────────────────────────────────────────
// Medidas/tipo   → azul oscuro / azul claro
// Medidas/estado → semáforo ordenado: activo verde, suspendido ámbar, finalizado gris, levantado azul, revocado rojo
// Resoluciones   → azul claro (MC→SCP), verde oscuro (levantados), rojo (revocados)
// Cumplimiento   → verde (cumpliendo), rojo (incumpliendo)  — igual en MC y SCP
// Supervisión    → morado / naranja (tipo), ámbar/verde/gris/rojo (estado)
// Personas       → azul/naranja/morado/gris (género)
const COLORES = {
    verde:      '#2d6a4f',
    verdeClaro: '#52b788',
    azul:       '#1a3a5c',
    azulClaro:  '#4a90d9',
    naranja:    '#e07b39',
    rojo:       '#c0392b',
    morado:     '#7b2d8b',
    amarillo:   '#f0b429',
    gris:       '#9ca3af',
};

const barOpts = () => ({
    responsive: true,
    maintainAspectRatio: false,
    hover: { mode: 'index', intersect: false },
    plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
        title:  { display: false },
        tooltip: { mode: 'index', intersect: false, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}` } },
        datalabels: { display: false },
    },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 } },
    },
});

const barHorizOpts = () => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    hover: { mode: 'y', intersect: false },
    plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
        title:  { display: false },
        tooltip: { mode: 'y', intersect: false, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.x}` } },
        datalabels: { display: false },
    },
    scales: {
        x: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
});

const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
        datalabels: { display: false },
    },
    elements: {
        arc: { borderWidth: 0, hoverOffset: 8 },
    },
};

const dDataset = (data, backgroundColor) => ({
    data, backgroundColor, borderWidth: 0, spacing: 2, borderRadius: 4,
});

// Opciones para barras verticales categóricas con etiquetas encima
const barCatOpts = () => ({
    responsive: true,
    maintainAspectRatio: false,
    barPercentage: 0.42,
    categoryPercentage: 0.65,
    layout: { padding: { top: 28 } },
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
            anchor: 'end',
            align: 'end',
            offset: -2,
            font: { size: 13, weight: 'bold', family: "'Segoe UI', sans-serif" },
            color: '#374151',
            formatter: v => (v == null || v === 0) ? '' : v,
        },
    },
    scales: {
        x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 11, weight: '500' }, color: '#6b7280', maxRotation: 15, minRotation: 0 },
        },
        y: {
            display: false,
            beginAtZero: true,
            grace: '20%',
        },
    },
});

// ── Tarjeta de resumen ──
const Tarjeta = ({ icono, valor, etiqueta, color, onClick }) => (
    <div className="est-tarjeta" style={{ borderTopColor: color, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
        <div className="est-tarjeta-icono" style={{ background: color + '18', color }}>
            <i className={icono} />
        </div>
        <div className="est-tarjeta-info">
            <span className="est-tarjeta-valor">{valor ?? '—'}</span>
            <span className="est-tarjeta-etiqueta">{etiqueta}</span>
        </div>
        {onClick && <i className="bi bi-arrow-right-short est-tarjeta-arrow" style={{ color }} />}
    </div>
);

// ── Separador de sección ──
const Seccion = ({ icono, label }) => (
    <div className="est-seccion">
        <div className="est-seccion-linea" />
        <div className="est-seccion-label"><i className={icono} /> {label}</div>
        <div className="est-seccion-linea" />
    </div>
);

// ── Card de gráfica ──
const GraficaCard = ({ id, titulo, subtitulo, children, span2 }) => (
    <div id={id} className={`est-card${span2 ? ' est-card-wide' : ''}`}>
        <div className="est-card-header">
            <span className="est-card-titulo">{titulo}</span>
            {subtitulo && <span className="est-card-sub">{subtitulo}</span>}
        </div>
        <div className="est-card-body">{children}</div>
    </div>
);

const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Highlight temporal
    el.classList.add('est-card-highlight');
    setTimeout(() => el.classList.remove('est-card-highlight'), 1800);
};

const Estadisticas = () => {
    const anioActual = new Date().getFullYear();
    const ANIO_INICIO = 2026;
    const [anio,      setAnio]      = useState(anioActual);
    const [mes,       setMes]       = useState(0);
    const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
    const [modoFiltro, setModoFiltro] = useState('anio'); // 'anio' | 'rango'
    const [rangoDesde, setRangoDesde] = useState(hoyISO());
    const [rangoHasta, setRangoHasta] = useState(hoyISO());
    const [datos,      setDatos]      = useState(null);
    const [cargando,   setCargando]   = useState(true);
    const [exportando, setExportando] = useState(false);
    const [consultas,  setConsultas]  = useState([]);
    const [corrStats,  setCorrStats]  = useState(null);
    const [segConsolidado, setSegConsolidado] = useState({});
    const [rdConsolidado,  setRdConsolidado]  = useState({});
    const [zonaFiltro, setZonaFiltro]  = useState('TODAS'); // 'TODAS' | 'XOCHITEPEC' | 'CUAUTLA' | 'JOJUTLA'

    // ── Calcula desde/hasta según el modo activo ──────────────────────────────
    const { desde, hasta } = useMemo(() => {
        const pad = n => String(n).padStart(2, '0');
        if (modoFiltro === 'rango') return { desde: rangoDesde, hasta: rangoHasta };
        if (mes > 0) {
            const diasMes = new Date(anio, mes, 0).getDate();
            return { desde: `${anio}-${pad(mes)}-01`, hasta: `${anio}-${pad(mes)}-${pad(diasMes)}` };
        }
        return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
    }, [modoFiltro, rangoDesde, rangoHasta, anio, mes]);

    const anioFiltro = parseInt(desde.split('-')[0], 10);


    const handleExportar = async () => {
        setExportando(true);
        try {
            const res = await exportarEstadisticasExcel(desde, hasta, zonaFiltro);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `estadisticas_${desde}_${hasta}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            // silenced
        } finally {
            setExportando(false);
        }
    };

    // ── Estadísticas principales + seguimientos (mismo rango) ────────────────
    useEffect(() => {
        setCargando(true);
        Promise.all([
            getEstadisticas(desde, hasta, zonaFiltro),
            getReporteConsolidado(desde, hasta),
            getConsolidadoRD({ inicio: desde, fin: hasta }).catch(() => ({ data: { ok: false } })),
        ])
            .then(([rEst, rSeg, rRD]) => {
                if (rEst.data.ok) setDatos(rEst.data.data);
                if (rSeg.data.ok) setSegConsolidado(rSeg.data.data || {});
                if (rRD.data.ok)  setRdConsolidado(rRD.data.data || {});
            })
            .catch(console.error)
            .finally(() => setCargando(false));
    }, [desde, hasta, zonaFiltro]);

    useEffect(() => {
        getConsultas()
            .then(r => { if (r.data.ok) setConsultas(r.data.data || []); })
            .catch(err => console.warn("Error al cargar datos:", err));
    }, []);

    useEffect(() => {
        getEstadisticasCorrespondencia(anioFiltro)
            .then(r => { if (r.data.ok) setCorrStats(r.data.data); })
            .catch(() => {});
    }, [anioFiltro]);

    // Filtra consultas según el rango de fechas activo
    const consultasFiltradas = useMemo(() => {
        return consultas.filter(c => {
            if (!c.fechaSolicitud) return false;
            const fecha = c.fechaSolicitud.split('T')[0];
            return fecha >= desde && fecha <= hasta;
        });
    }, [consultas, desde, hasta]);

    const consultasPos = useMemo(() => consultasFiltradas.filter(c => c.resultado === 'POSITIVO').length, [consultasFiltradas]);
    const consultasNeg = useMemo(() => consultasFiltradas.filter(c => c.resultado === 'NEGATIVO').length, [consultasFiltradas]);

    const anios = Array.from({ length: anioActual - ANIO_INICIO + 1 }, (_, i) => ANIO_INICIO + i).reverse();

    if (!datos && cargando) return <div className="est-cargando"><i className="bi bi-arrow-repeat" /> Cargando estadísticas...</div>;
    if (!datos)             return <div className="est-cargando">No se pudieron cargar los datos.</div>;

    // Series mensuales
    const mesesMC        = porMes(datos.medidas_por_mes);
    const mesesFallecidos = porMes(datos.fallecidos_por_mes);
    const mesesTta        = porMes(datos.tta_por_mes);
    const mesesSup       = porMes(datos.supervisiones_por_mes);
    const mesesLlam      = porMes(datos.llamadas_por_mes);
    const mesesVis       = porMes(datos.visitas_por_mes);
    const mesesEval      = porMes(datos.evaluaciones_por_mes);
    const mesesLevantado = porMes(datos.levantados_por_mes);
    const mesesRevocado  = porMes(datos.revocados_por_mes);
    const mesesScpCambio = porMes(datos.scp_cambio_por_mes);
    const mesesMcCambio  = porMes(datos.mc_cambio_por_mes);

    const total   = arr => arr.reduce((a, b) => a + b, 0);
    const promedio = arr => { const t = total(arr); return t === 0 ? 0 : Math.round(t / arr.filter(v => v > 0).length); };
    const maximo   = arr => Math.max(...arr);

    const formatFechaCorta = (iso) => {
        if (!iso) return '—';
        const [y, m, d] = iso.split('-').map(Number);
        return `${d} ${MESES_FULL[m]?.slice(0, 3) ?? ''} ${y}`;
    };
    const subtituloFiltro = modoFiltro === 'rango'
        ? `${formatFechaCorta(desde)} — ${formatFechaCorta(hasta)}`
        : mes > 0 ? `${MESES_FULL[mes]} ${anio}` : `Año ${anio}`;

    return (
        <div className="est-wrapper">

            {/* ── Header ── */}
            <div className="est-header">

                {/* Fila 1: [spacer] + período activo centrado + exportar */}
                <div className="est-header-top">
                    <div />{/* spacer izquierdo */}
                    <div className="est-periodo-badge">
                        <i className="bi bi-calendar-check-fill" />
                        <span>{subtituloFiltro}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <button className="est-btn-exportar" onClick={handleExportar} disabled={exportando} title="Exportar a Excel">
                            {exportando
                                ? <><i className="bi bi-arrow-repeat est-spin" /> Exportando...</>
                                : <><i className="bi bi-file-earmark-excel-fill" /> Exportar Excel</>
                            }
                        </button>
                        <span style={{ fontSize: 11, color: '#374151', fontWeight: 500, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-info-circle-fill" style={{ color: '#16a34a' }} />
                            La exportación se realizará de acuerdo al período seleccionado
                        </span>
                    </div>
                </div>

                {/* Fila 2: toggle de modo + filtros */}
                <div className="est-filtros-bar">
                    <div className="est-modo-tabs">
                        <button
                            className={`est-modo-tab ${modoFiltro === 'anio' ? 'est-modo-activo' : ''}`}
                            onClick={() => setModoFiltro('anio')}
                        >
                            <i className="bi bi-calendar3" /> Por año
                        </button>
                        <button
                            className={`est-modo-tab ${modoFiltro === 'rango' ? 'est-modo-activo' : ''}`}
                            onClick={() => setModoFiltro('rango')}
                        >
                            <i className="bi bi-calendar-range" /> Rango libre
                        </button>
                    </div>

                    <div className="est-filtros-sep" />

                    <div className="est-filtro-grupo">
                        <label className="est-filtro-label"><i className="bi bi-geo-alt-fill" /> Zona</label>
                        <select className="est-mes-sel" value={zonaFiltro} onChange={e => setZonaFiltro(e.target.value)}>
                            <option value="TODAS">Todas</option>
                            <option value="XOCHITEPEC">Xochitepec</option>
                            <option value="CUAUTLA">Cuautla</option>
                            <option value="JOJUTLA">Jojutla</option>
                        </select>
                    </div>

                    <div className="est-filtros-sep" />

                    {modoFiltro === 'anio' ? (
                        <div className="est-filtros-inputs">
                            <div className="est-filtro-grupo">
                                <label className="est-filtro-label"><i className="bi bi-calendar3" /> Año</label>
                                <select className="est-mes-sel" value={anio} onChange={e => setAnio(Number(e.target.value))}>
                                    {anios.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div className="est-filtro-grupo">
                                <label className="est-filtro-label"><i className="bi bi-calendar-month" /> Mes</label>
                                <select className="est-mes-sel" value={mes} onChange={e => setMes(Number(e.target.value))}>
                                    {MESES_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="est-filtros-inputs">
                            <div className="est-filtro-grupo">
                                <label className="est-filtro-label"><i className="bi bi-arrow-right-circle" /> Desde</label>
                                <input type="date" className="est-mes-sel" value={rangoDesde} onChange={e => setRangoDesde(e.target.value)} />
                            </div>
                            <div className="est-filtro-grupo">
                                <label className="est-filtro-label"><i className="bi bi-arrow-left-circle" /> Hasta</label>
                                <input type="date" className="est-mes-sel" value={rangoHasta} onChange={e => setRangoHasta(e.target.value)} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Contenido (con transición de opacidad al recargar) ── */}
            <div style={{ opacity: cargando ? 0.45 : 1, transition: 'opacity .25s', pointerEvents: cargando ? 'none' : 'auto' }}>

            {/* ── Tarjetas resumen ── */}
            <div className="est-tarjetas">
                <Tarjeta icono="bi bi-people-fill"             valor={datos.totalImputados}    etiqueta="Total Imputados"           color={COLORES.azul}       onClick={() => scrollTo('chart-entrevistas')} />
                <Tarjeta icono="bi bi-journal-text"            valor={datos.totalEntrevistas}  etiqueta="Entrevistas de Encuadre"   color={COLORES.verde}      onClick={() => scrollTo('chart-entrevistas')} />
                <Tarjeta icono="bi bi-clipboard2-pulse"        valor={datos.totalEvaluaciones} etiqueta="Evaluaciones de Riesgo"    color={COLORES.verdeClaro} onClick={() => scrollTo('chart-evaluaciones')} />
                <Tarjeta icono="bi bi-card-checklist"          valor={datos.totalMedidas}      etiqueta="Medidas / S.C.P."          color={COLORES.morado}     onClick={() => scrollTo('chart-medidas-tipo')} />
                <Tarjeta icono="bi bi-telephone-fill"          valor={datos.totalSupervisiones} etiqueta="Total Supervisiones"      color={COLORES.naranja}    onClick={() => scrollTo('chart-sup-tipo')} />
                <Tarjeta icono="bi bi-exclamation-triangle-fill" valor={datos.totalSupervisionPendiente} etiqueta="Supervisiones Pendientes" color={COLORES.rojo} onClick={() => scrollTo('chart-sup-estado')} />
                <Tarjeta icono="bi bi-person-x-fill"              valor={datos.totalFallecidos}           etiqueta="Fallecidos"                color="#374151"    onClick={() => scrollTo('chart-fallecidos')} />
                <Tarjeta icono="bi bi-search"                      valor={consultas.length}                etiqueta="Consultas de Antecedentes"           color={COLORES.verde}  onClick={() => scrollTo('chart-consultas')} />
            </div>

            {/* ── Grid de gráficas ── */}
            {/*
                Orden y colores por sección:
                Fila 1 — MEDIDAS   : tipo (azul/azulClaro) · estado (semáforo) · resoluciones (azulClaro/verde/rojo)
                Fila 2 — CUMPLIM.  : MC (verde/rojo) · SCP (verde/rojo) · entrevistas (azul/azulClaro/gris)
                Fila 3 — SUPERVISIÓN: tipo (morado/naranja) · estado (ámbar/verde/gris/rojo) · (hueco o extra)
                Fila 4 — GÉNERO    : MC · SCP
            */}
            <div className="est-grid">

                <Seccion icono="bi bi-card-checklist" label="Medidas y S.C.P." />

                {/* Medidas por tipo  — azul oscuro / azul claro */}
                <GraficaCard id="chart-medidas-tipo" titulo="Medidas y S.C.P." subtitulo={`Distribución por tipo · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Medida Cautelar', 'Susp. Condicional'],
                            datasets: [{ data: [datos.medidasPorTipo?.MEDIDA_CAUTELAR, datos.medidasPorTipo?.SUSPENSION_CONDICIONAL], backgroundColor: [COLORES.azul, COLORES.azulClaro], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                {/* 2. Estado de medidas — semáforo: verde · ámbar · gris · azulClaro · rojo */}
                <GraficaCard id="chart-medidas-estado" titulo="Estado de Medidas" subtitulo={`Medidas en curso · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Activo', 'Suspendido', 'Finalizado'],
                            datasets: [{ data: [datos.medidasPorEstado?.ACTIVO, datos.medidasPorEstado?.SUSPENDIDO, datos.medidasPorEstado?.FINALIZADO], backgroundColor: [COLORES.verdeClaro, COLORES.amarillo, COLORES.gris], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                {/* 3. Resoluciones — azulClaro (MC→SCP) · naranja (SCP→MC) · verde oscuro (levantados) · rojo (revocados) */}
                <GraficaCard id="chart-resoluciones" titulo="Resoluciones de Medidas" subtitulo={`MC→SCP · SCP→MC · Levantamientos · Revocados · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['MC → SCP', 'SCP → MC', 'Levantados', 'Revocados'],
                            datasets: [{ data: [datos.cambiadoAScp, datos.cambiadoAMc, datos.levantamientos, datos.revocados], backgroundColor: [COLORES.azulClaro, '#f97316', COLORES.verde, COLORES.rojo], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-check2-circle" label="Cumplimiento" />

                {/* Cumplimiento MC — verde (cumpliendo) · rojo (incumpliendo) */}
                <GraficaCard id="chart-cumplimiento-mc" titulo="Cumplimiento M.C." subtitulo={`Medidas Cautelares · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Cumpliendo', 'Incumpliendo'],
                            datasets: [{ data: [datos.cumplimientoMC?.CUMPLIENDO, datos.cumplimientoMC?.INCUMPLIENDO], backgroundColor: [COLORES.verde, COLORES.rojo], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                {/* 5. Cumplimiento SCP — verde (cumpliendo) · rojo (incumpliendo) */}
                <GraficaCard id="chart-cumplimiento-scp" titulo="Cumplimiento S.C.P." subtitulo={`Suspensión Condicional · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Cumpliendo', 'Incumpliendo'],
                            datasets: [{ data: [datos.cumplimientoSCP?.CUMPLIENDO, datos.cumplimientoSCP?.INCUMPLIENDO], backgroundColor: [COLORES.verde, COLORES.rojo], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                {/* 6. Entrevistas por tipo — azul · azulClaro · gris */}
                <GraficaCard id="chart-entrevistas" titulo="Entrevistas de Encuadre" subtitulo={`Tipo de seguimiento · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Medida Cautelar', 'S.C.P.', 'Sin asignar'],
                            datasets: [{ data: [datos.entrevistasPorTipo?.MC, datos.entrevistasPorTipo?.SCP, datos.entrevistasPorTipo?.SIN_ASIGNAR], backgroundColor: [COLORES.azul, COLORES.azulClaro, COLORES.gris], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-telephone-fill" label="Supervisión en Libertad" />

                {/* Tipo supervisión — morado (llamadas) · naranja (visitas) */}
                <GraficaCard id="chart-sup-tipo" titulo="Tipo de Supervisión" subtitulo={`Llamadas vs Visitas · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Llamadas', 'Visitas domiciliarias'],
                            datasets: [{ data: [datos.supervisionesPorTipo?.LLAMADA, datos.supervisionesPorTipo?.VISITA_DOMICILIARIA], backgroundColor: [COLORES.morado, COLORES.naranja], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                {/* 8. Estado supervisiones — ámbar · verde · gris · rojo */}
                <GraficaCard id="chart-sup-estado" titulo="Estado de Supervisiones" subtitulo={`Distribución por estado · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Pendiente', 'Realizada', 'No contactado', 'Cancelada'],
                            datasets: [{ data: [datos.supervisionesPorEstado?.PENDIENTE, datos.supervisionesPorEstado?.REALIZADA, datos.supervisionesPorEstado?.NO_CONTACTADO, datos.supervisionesPorEstado?.CANCELADA], backgroundColor: [COLORES.amarillo, COLORES.verdeClaro, COLORES.gris, COLORES.rojo], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-people-fill" label="Distribución por Género" />

                {/* Género MC — azul · naranja · morado · gris */}
                <GraficaCard id="chart-genero-mc" titulo="Género — M.C." subtitulo={`Medidas Cautelares por género · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Masculino', 'Femenino', 'No binario', 'Sin dato'],
                            datasets: [{ data: [datos.generoPorMC?.Masculino, datos.generoPorMC?.Femenino, datos.generoPorMC?.['No binario'], datos.generoPorMC?.['Sin dato']], backgroundColor: [COLORES.azul, COLORES.naranja, COLORES.morado, COLORES.gris], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                {/* 10. Género SCP — misma paleta que MC */}
                <GraficaCard id="chart-genero-scp" titulo="Género — S.C.P." subtitulo={`Suspensión Condicional por género · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Masculino', 'Femenino', 'No binario', 'Sin dato'],
                            datasets: [{ data: [datos.generoPorSCP?.Masculino, datos.generoPorSCP?.Femenino, datos.generoPorSCP?.['No binario'], datos.generoPorSCP?.['Sin dato']], backgroundColor: [COLORES.azul, COLORES.naranja, COLORES.morado, COLORES.gris], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-search" label="Consultas de Antecedentes" />

                {/* Consultas Positivas vs Negativas */}
                <GraficaCard id="chart-consultas" titulo="Consultas de Antecedentes" subtitulo={`Positivas vs Negativas · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Positivas', 'Negativas'],
                            datasets: [{ data: [consultasPos, consultasNeg], backgroundColor: [COLORES.verde, COLORES.rojo], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-clipboard-data-fill" label="Actividad de Seguimientos" />

                {/* Seguimientos por tipo de actividad agrupados por zona */}
                {(() => {
                    const ZONAS        = ['XOCHITEPEC', 'CUAUTLA', 'JOJUTLA'];
                    const ZONA_COLORES = [COLORES.verde, COLORES.azulClaro, COLORES.naranja];

                    // Zonas activas según el filtro
                    const zonasFiltradas = zonaFiltro === 'TODAS' ? ZONAS : [zonaFiltro];
                    const coloresFiltrados = zonasFiltradas.map(z => ZONA_COLORES[ZONAS.indexOf(z)]);

                    const tiposSuper = TIPOS_ACTIVIDAD.filter(t => t.grupo === 'SUPERVISIÓN');

                    // Campos compartidos (aparecen en Super y Eval → se suman en General)
                    const GENERAL_MANUALES = [
                        {
                            label: 'Firmas recabadas',
                            keys: ['firmasRecabadasSuper', 'firmasRecabadasEval'],
                        },
                        {
                            label: 'Entrevista de encuadre',
                            keys: ['entrevistaEncuadreSuper', 'entrevistaEncuadreEval'],
                        },
                    ];

                    // Campos exclusivos de supervisión
                    const SUPER_MANUALES = [
                        { key: 'calendarioSuper',          label: 'Calendario' },
                        { key: 'capturaCarpetas',          label: 'Captura de carpetas' },
                        { key: 'capturaOficiosImposicion', label: 'Cap. oficios imposición' },
                    ];

                    // Campos exclusivos de evaluación
                    const EVAL_MANUALES = [
                        { key: 'oficiosRegistros',         label: 'Oficios de registros' },
                        { key: 'opinionTecnicaFC',         label: 'Opinión técnica F.C.' },
                        { key: 'opinionTecnicaFF',         label: 'Opinión técnica F.F.' },
                        { key: 'negacionesFC',             label: 'Negaciones F.C.' },
                        { key: 'negacionesFF',             label: 'Negaciones F.F.' },
                        { key: 'informesFC',               label: 'Informes F.C.' },
                        { key: 'informesFF',               label: 'Informes F.F.' },
                        { key: 'entrevistaEvaluacionEval', label: 'Entrevista de evaluación' },
                    ];

                    // Campos de correspondencia (de ReporteDiario)
                    const CORR_MANUALES = [
                        { key: 'totalOficiosRecibidos', label: 'Oficios recibidos' },
                        { key: 'nuevosCasosMC',         label: 'Nuevos Casos M.C.' },
                        { key: 'nuevosCasosSCP',        label: 'Nuevos Casos S.C.P.' },
                        { key: 'sobreseimientos',       label: 'Sobreseimientos' },
                        { key: 'levantamientoMedida',   label: 'Levantamiento medida' },
                        { key: 'oficiosDiversosCorr',   label: 'Oficios diversos' },
                    ];

                    const rdPorZona = (zona, key) => Number(rdConsolidado[zona]?.[key] ?? 0);

                    // Suma de campos generales (multi-key) por zona
                    const generalPorZona = (zona, item) =>
                        item.keys.reduce((s, k) => s + rdPorZona(zona, k), 0);

                    const totGeneral = zonasFiltradas.map(z =>
                        GENERAL_MANUALES.reduce((s, item) => s + generalPorZona(z, item), 0)
                    );
                    const totSuper = zonasFiltradas.map(z =>
                        tiposSuper.reduce((s, t) => s + Number(segConsolidado[z]?.[t.value] ?? 0), 0)
                        + SUPER_MANUALES.reduce((s, m) => s + rdPorZona(z, m.key), 0)
                    );
                    const totEval = zonasFiltradas.map(z =>
                        EVAL_MANUALES.reduce((s, m) => s + rdPorZona(z, m.key), 0)
                    );
                    const totCorr = zonasFiltradas.map(z =>
                        CORR_MANUALES.reduce((s, m) => s + rdPorZona(z, m.key), 0)
                    );

                    const totalPorZona = ZONAS.map(z =>
                        TIPOS_ACTIVIDAD.reduce((s, t) => s + (segConsolidado[z]?.[t.value] ?? 0), 0)
                        + GENERAL_MANUALES.reduce((s, item) => s + generalPorZona(z, item), 0)
                        + SUPER_MANUALES.reduce((s, m) => s + rdPorZona(z, m.key), 0)
                        + EVAL_MANUALES.reduce((s, m) => s + rdPorZona(z, m.key), 0)
                        + CORR_MANUALES.reduce((s, m) => s + rdPorZona(z, m.key), 0)
                    );
                    const totalSeg = totalPorZona.reduce((a, b) => a + b, 0);

                    const chartOpts = {
                        responsive: true,
                        maintainAspectRatio: false,
                        barPercentage: 0.42,
                        categoryPercentage: 0.65,
                        layout: { padding: { top: 28 } },
                        plugins: {
                            legend: { display: zonasFiltradas.length > 1, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
                            tooltip: { enabled: false },
                            datalabels: {
                                anchor: 'end', align: 'end', offset: -2,
                                font: { size: 12, weight: 'bold' },
                                color: '#374151',
                                formatter: v => (v == null || v === 0) ? '' : v,
                            },
                        },
                        scales: {
                            x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10, weight: '500' }, color: '#6b7280', maxRotation: 25, minRotation: 0 } },
                            y: { display: false, beginAtZero: true, grace: '20%' },
                        },
                    };

                    // Builder para campos simples (clave única por zona)
                    const buildChart = (tiposSeg, manuales) => {
                        const itemsSeg = tiposSeg.filter(t =>
                            ZONAS.reduce((s, z) => s + Number(segConsolidado[z]?.[t.value] ?? 0), 0) > 0
                        );
                        const itemsMan = manuales.filter(m =>
                            ZONAS.reduce((s, z) => s + rdPorZona(z, m.key), 0) > 0
                        );
                        const allLabels = [...itemsSeg.map(t => t.label), ...itemsMan.map(m => m.label)];
                        if (allLabels.length === 0) return null;
                        const data = {
                            labels: allLabels,
                            datasets: zonasFiltradas.length === 1
                                ? [{ label: zonasFiltradas[0], data: [...itemsSeg.map(t => Number(segConsolidado[zonasFiltradas[0]]?.[t.value] ?? 0)), ...itemsMan.map(m => rdPorZona(zonasFiltradas[0], m.key))], backgroundColor: coloresFiltrados[0] + 'cc', borderRadius: 8, borderWidth: 0 }]
                                : zonasFiltradas.map((z, zi) => ({ label: z.charAt(0) + z.slice(1).toLowerCase(), data: [...itemsSeg.map(t => Number(segConsolidado[z]?.[t.value] ?? 0)), ...itemsMan.map(m => rdPorZona(z, m.key))], backgroundColor: coloresFiltrados[zi] + 'cc', borderRadius: 6, borderWidth: 0 })),
                        };
                        return { data, opts: chartOpts };
                    };

                    // Builder para campos generales (multi-key sumados)
                    const buildGeneralChart = (items) => {
                        const activos = items.filter(item =>
                            ZONAS.reduce((s, z) => s + generalPorZona(z, item), 0) > 0
                        );
                        if (activos.length === 0) return null;
                        const data = {
                            labels: activos.map(item => item.label),
                            datasets: zonasFiltradas.length === 1
                                ? [{ label: zonasFiltradas[0], data: activos.map(item => generalPorZona(zonasFiltradas[0], item)), backgroundColor: coloresFiltrados[0] + 'cc', borderRadius: 8, borderWidth: 0 }]
                                : zonasFiltradas.map((z, zi) => ({ label: z.charAt(0) + z.slice(1).toLowerCase(), data: activos.map(item => generalPorZona(z, item)), backgroundColor: coloresFiltrados[zi] + 'cc', borderRadius: 6, borderWidth: 0 })),
                        };
                        return { data, opts: chartOpts };
                    };

                    const generalChart = buildGeneralChart(GENERAL_MANUALES);
                    const superChart   = buildChart(tiposSuper, SUPER_MANUALES);
                    const evalChart    = buildChart([], EVAL_MANUALES);
                    const corrChart    = buildChart([], CORR_MANUALES);

                    const Separador = () => <div style={{ margin: '28px 28px 0', borderTop: '1.5px solid #e5e7eb' }} />;

                    return (<>
                        <div className="est-card est-card-wide">
                            <div className="est-seg-header">
                                <div className="est-seg-header-info">
                                    <span className="est-seg-titulo">Actividad de Seguimientos por Zona</span>
                                    <span className="est-seg-sub">{subtituloFiltro} · Supervisión · Evaluación · Correspondencia</span>
                                </div>
                                <div className="est-seg-chips">
                                    <span className="est-seg-chips-label">Actividades totales por zona</span>
                                    {ZONAS.map((z, i) => (
                                        <div key={z} className="est-seg-chip" style={{ borderColor: ZONA_COLORES[i], color: ZONA_COLORES[i] }}>
                                            <span className="est-seg-chip-dot" style={{ background: ZONA_COLORES[i] }} />
                                            <strong>{totalPorZona[i]}</strong>
                                            <span>{z}</span>
                                        </div>
                                    ))}
                                    <div className="est-seg-chip est-seg-chip-total">
                                        <i className="bi bi-stack" />
                                        <strong>{totalSeg}</strong>
                                        <span>TOTAL</span>
                                    </div>
                                </div>
                            </div>

                            {/* General — campos compartidos sumados */}
                            {generalChart && <>
                                <div className="est-seg-bloque" style={{ marginTop: 20 }}>
                                    <div className="est-seg-bloque-titulo">
                                        <i className="bi bi-diagram-3-fill" style={{ color: COLORES.azul }} />
                                        <span>General</span>
                                        <span className="est-seg-grafica-total">{totGeneral.reduce((a,b)=>a+b,0)} actividades</span>
                                    </div>
                                    <div style={{ height: 220 }}><Bar data={generalChart.data} options={generalChart.opts} /></div>
                                </div>
                                <Separador />
                            </>}

                            {/* Supervisión */}
                            <div className="est-seg-bloque" style={{ marginTop: 20 }}>
                                <div className="est-seg-bloque-titulo">
                                    <i className="bi bi-telephone-fill" style={{ color: COLORES.morado }} />
                                    <span>Supervisión</span>
                                    <span className="est-seg-grafica-total">{totSuper.reduce((a,b)=>a+b,0)} actividades</span>
                                </div>
                                {superChart
                                    ? <div style={{ height: 240 }}><Bar data={superChart.data} options={superChart.opts} /></div>
                                    : <p className="est-seg-vacio">Sin actividades registradas</p>
                                }
                            </div>

                            <Separador />

                            {/* Evaluación */}
                            <div className="est-seg-bloque" style={{ marginTop: 20 }}>
                                <div className="est-seg-bloque-titulo">
                                    <i className="bi bi-clipboard2-pulse-fill" style={{ color: COLORES.verde }} />
                                    <span>Evaluación</span>
                                    <span className="est-seg-grafica-total">{totEval.reduce((a,b)=>a+b,0)} actividades</span>
                                </div>
                                {evalChart
                                    ? <div style={{ height: 240, paddingBottom: 16 }}><Bar data={evalChart.data} options={evalChart.opts} /></div>
                                    : <p className="est-seg-vacio">Sin actividades registradas</p>
                                }
                            </div>

                            <Separador />

                            {/* Correspondencia */}
                            <div className="est-seg-bloque" style={{ marginTop: 20 }}>
                                <div className="est-seg-bloque-titulo">
                                    <i className="bi bi-envelope-paper-fill" style={{ color: COLORES.naranja }} />
                                    <span>Correspondencia</span>
                                    <span className="est-seg-grafica-total">{totCorr.reduce((a,b)=>a+b,0)} actividades</span>
                                </div>
                                {corrChart
                                    ? <div style={{ height: 240, paddingBottom: 16 }}><Bar data={corrChart.data} options={corrChart.opts} /></div>
                                    : <p className="est-seg-vacio">Sin actividades registradas</p>
                                }
                            </div>
                        </div>
                    </>);
                })()}

                {/* ── SECCIÓN CORRESPONDENCIA ── */}
                <Seccion label="Correspondencia" icono="bi bi-envelope-paper" />

                {corrStats ? (() => {
                    // Helpers: buscar valor fijo sin depender de lo que devuelva el backend
                    const byTipo  = (k) => Number(corrStats.porTipo?.find(([t]) => t === k)?.[1] ?? 0);
                    const byPrio  = (k) => Number(corrStats.porPrioridad?.find(([p]) => p === k)?.[1] ?? 0);
                    const byEst   = (k) => Number(corrStats.porEstado?.find(([e]) => e === k)?.[1] ?? 0);
                    return (<>
                    {/* Por tipo — siempre 3 segmentos */}
                    <GraficaCard titulo="Oficios por tipo" subtitulo={`Distribución por tipo · ${anioFiltro}`}>
                        <div className="est-dona-wrap">
                            <Bar options={barCatOpts()} data={{
                                labels: ['Oficio', 'Correo', 'WhatsApp'],
                                datasets: [{ data: [byTipo('OFICIO'), byTipo('CORREO'), byTipo('WHATSAPP')], backgroundColor: [COLORES.verde, COLORES.azulClaro, COLORES.naranja], borderRadius: 8, borderWidth: 0 }],
                            }} />
                        </div>
                    </GraficaCard>

                    {/* Por prioridad — 5 segmentos */}
                    <GraficaCard titulo="Oficios por prioridad" subtitulo={`Distribución por prioridad · ${anioFiltro}`}>
                        <div className="est-dona-wrap">
                            <Bar options={barCatOpts()} data={{
                                labels: ['Normal', 'Urgente', 'De Conocimiento', 'Turno', 'Circular'],
                                datasets: [{ data: [byPrio('NORMAL'), byPrio('URGENTE'), byPrio('DE_CONOCIMIENTO'), byPrio('TURNO'), byPrio('CIRCULAR')], backgroundColor: [COLORES.gris, COLORES.rojo, COLORES.azulClaro, COLORES.naranja, COLORES.morado], borderRadius: 8, borderWidth: 0 }],
                            }} />
                        </div>
                    </GraficaCard>

                    {/* Por estado — siempre 5 segmentos */}
                    <GraficaCard titulo="Oficios por estado" subtitulo={`Estado actual de todos los oficios · ${anioFiltro}`}>
                        <div className="est-dona-wrap">
                            <Bar options={barCatOpts()} data={{
                                labels: ['Pendiente', 'Asignado', 'Leído', 'En Espera', 'Finalizado'],
                                datasets: [{ data: [byEst('PENDIENTE'), byEst('ASIGNADO'), byEst('LEIDO'), byEst('EN_ESPERA'), byEst('FINALIZADO')], backgroundColor: [COLORES.amarillo, COLORES.azulClaro, COLORES.verdeClaro, COLORES.naranja, COLORES.verde], borderRadius: 8, borderWidth: 0 }],
                            }} />
                        </div>
                    </GraficaCard>

                    {/* Por mes — línea */}
                    <GraficaCard titulo="Oficios registrados por mes" subtitulo={`Evolución mensual · ${anioFiltro}`} span2>
                        <div className="est-bar-stats">
                            <span><strong>{corrStats.total ?? 0}</strong> Total</span>
                            <span><strong>{corrStats.conTermino ?? 0}</strong> Con término</span>
                            <span><strong>{corrStats.sinTermino ?? 0}</strong> Sin término</span>
                        </div>
                        <div className="est-bar-wrap">
                            <Line options={{ ...barOpts(), elements: { line: { tension: 0.4 }, point: { radius: 4 } } }} data={{
                                labels: MESES,
                                datasets: [{
                                    label: 'Oficios recibidos',
                                    data: (() => { const arr = Array(12).fill(0); (corrStats.porMes ?? []).forEach(([m, c]) => { arr[Number(m) - 1] = Number(c); }); return arr; })(),
                                    borderColor: COLORES.verde, backgroundColor: COLORES.verde + '22', fill: true, pointBackgroundColor: COLORES.verde,
                                }],
                            }} />
                        </div>
                    </GraficaCard>
                    </>);
                })() : (
                    <div className="est-cargando" style={{ gridColumn: '1/-1' }}>Cargando datos de correspondencia...</div>
                )}

                <Seccion icono="bi bi-person-x-fill" label="Fallecidos" />

                {/* Fallecidos — imputados activos vs fallecidos (totales acumulados) */}
                <GraficaCard id="chart-fallecidos" titulo="Fallecidos" subtitulo="Imputados activos vs fallecidos · Total acumulado">
                    <div className="est-dona-wrap">
                        <Bar options={barCatOpts()} data={{
                            labels: ['Activos', 'Fallecidos'],
                            datasets: [{ data: [datos.totalActivos ?? 0, datos.totalFallecidos ?? 0], backgroundColor: ['#d1d5db', '#374151'], borderRadius: 8, borderWidth: 0 }],
                        }} />
                    </div>
                </GraficaCard>

                {/* 12. Fallecidos por mes — barra wide, gris oscuro */}
                <GraficaCard id="chart-fallecidos-mes" titulo="Fallecidos por Mes" subtitulo={`Registro de fallecimientos por mes · ${anioFiltro}`} span2>
                    <div className="est-bar-stats">
                        <span><strong>{total(mesesFallecidos)}</strong> Total en el año</span>
                        <span><strong>{maximo(mesesFallecidos)}</strong> Mes más alto</span>
                    </div>
                    <div className="est-bar-wrap">
                        <Bar options={barOpts()} data={{
                            labels: MESES,
                            datasets: [{ label: 'Fallecidos', data: mesesFallecidos, backgroundColor: '#37415180', hoverBackgroundColor: '#374151', borderRadius: 4 }],
                        }} />
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-hospital-fill" label="Programa TTA" />

                {/* TTA por mes — barra wide, morado */}
                <GraficaCard id="chart-tta" titulo="Programa TTA por Mes" subtitulo={`Personas en Tratamiento y Terapias Ambulatorias · ${anioFiltro}`} span2>
                    <div className="est-bar-stats">
                        <span><strong>{total(mesesTta)}</strong> Total en el año</span>
                        <span><strong>{maximo(mesesTta)}</strong> Mes más alto</span>
                    </div>
                    <div className="est-bar-wrap">
                        <Bar options={barOpts()} data={{
                            labels: MESES,
                            datasets: [{ label: 'Programa TTA', data: mesesTta, backgroundColor: COLORES.morado + 'cc', hoverBackgroundColor: COLORES.morado, borderRadius: 4 }],
                        }} />
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-bar-chart-fill" label="Tendencias Mensuales" />

                {/* Medidas por mes — azul */}
                <GraficaCard id="chart-medidas-mes" titulo="Registros de Medidas / S.C.P." subtitulo={`Nuevos registros por mes · ${anioFiltro}`} span2>
                    <div className="est-bar-stats">
                        <span><strong>{total(mesesMC)}</strong> Total</span>
                        <span><strong>{promedio(mesesMC)}</strong> Promedio mensual</span>
                        <span><strong>{maximo(mesesMC)}</strong> Mes más alto</span>
                    </div>
                    <div className="est-bar-wrap">
                        <Bar options={barOpts()} data={{
                            labels: MESES,
                            datasets: [{ label: 'Medidas / S.C.P.', data: mesesMC, backgroundColor: COLORES.azul + 'cc', hoverBackgroundColor: COLORES.azul, borderRadius: 4 }],
                        }} />
                    </div>
                </GraficaCard>

                {/* 12. Resoluciones por mes — azulClaro · naranja · verde · rojo */}
                <GraficaCard id="chart-resoluciones-mes" titulo="Resoluciones por Mes" subtitulo={`MC→SCP · SCP→MC · Levantamientos · Revocados · ${anioFiltro}`} span2>
                    <div className="est-bar-stats">
                        <span><strong>{total(mesesScpCambio)}</strong> MC→SCP</span>
                        <span><strong>{total(mesesMcCambio)}</strong> SCP→MC</span>
                        <span><strong>{total(mesesLevantado)}</strong> Levantados</span>
                        <span><strong>{total(mesesRevocado)}</strong> Revocados</span>
                    </div>
                    <div className="est-bar-wrap">
                        <Bar options={barOpts()} data={{
                            labels: MESES,
                            datasets: [
                                { label: 'MC → SCP',   data: mesesScpCambio, backgroundColor: COLORES.azulClaro + 'cc', hoverBackgroundColor: COLORES.azulClaro, borderRadius: 4 },
                                { label: 'SCP → MC',   data: mesesMcCambio,  backgroundColor: '#f97316cc',              hoverBackgroundColor: '#f97316',          borderRadius: 4 },
                                { label: 'Levantados', data: mesesLevantado, backgroundColor: COLORES.verde + 'cc',     hoverBackgroundColor: COLORES.verde,      borderRadius: 4 },
                                { label: 'Revocados',  data: mesesRevocado,  backgroundColor: COLORES.rojo + 'cc',      hoverBackgroundColor: COLORES.rojo,       borderRadius: 4 },
                            ],
                        }} />
                    </div>
                </GraficaCard>

                {/* 13. Supervisiones por mes — morado · naranja */}
                <GraficaCard id="chart-supervisiones-mes" titulo="Supervisión en Libertad" subtitulo={`Llamadas y visitas por mes · ${anioFiltro}`} span2>
                    <div className="est-bar-stats">
                        <span><strong>{total(mesesLlam)}</strong> Llamadas</span>
                        <span><strong>{total(mesesVis)}</strong> Visitas</span>
                        <span><strong>{total(mesesSup)}</strong> Total</span>
                    </div>
                    <div className="est-bar-wrap">
                        <Bar options={barOpts()} data={{
                            labels: MESES,
                            datasets: [
                                { label: 'Llamadas', data: mesesLlam, backgroundColor: COLORES.morado + 'cc', hoverBackgroundColor: COLORES.morado, borderRadius: 4 },
                                { label: 'Visitas',  data: mesesVis,  backgroundColor: COLORES.naranja + 'cc', hoverBackgroundColor: COLORES.naranja, borderRadius: 4 },
                            ],
                        }} />
                    </div>
                </GraficaCard>

                {/* 14. Evaluaciones por mes — verde (línea) */}
                <GraficaCard id="chart-evaluaciones" titulo="Evaluaciones de Riesgo" subtitulo={`Evaluaciones realizadas por mes · ${anioFiltro}`} span2>
                    <div className="est-bar-stats">
                        <span><strong>{total(mesesEval)}</strong> Total</span>
                        <span><strong>{promedio(mesesEval)}</strong> Promedio mensual</span>
                        <span><strong>{maximo(mesesEval)}</strong> Mes más alto</span>
                    </div>
                    <div className="est-bar-wrap">
                        <Line options={{ ...barOpts(), elements: { line: { tension: 0.4 }, point: { radius: 4 } } }} data={{
                            labels: MESES,
                            datasets: [{ label: 'Evaluaciones', data: mesesEval, borderColor: COLORES.verde, backgroundColor: COLORES.verde + '22', fill: true, pointBackgroundColor: COLORES.verde }],
                        }} />
                    </div>
                </GraficaCard>

                {/* 15. Fracciones MC — azul */}
                {datos.fraccionesMasUsadasMC?.length > 0 && (
                    <GraficaCard titulo="Fracciones más impuestas — M.C." subtitulo="Art. 155 CNPP" span2>
                        <div className="est-bar-wrap" style={{ height: Math.max(160, datos.fraccionesMasUsadasMC.slice(0,8).length * 44 + 40) }}>
                            <Bar
                                options={barHorizOpts()}
                                data={{
                                    labels: datos.fraccionesMasUsadasMC.slice(0,8).map(([f]) => `Fracc. ${f}`),
                                    datasets: [{ label: 'Veces impuesta', data: datos.fraccionesMasUsadasMC.slice(0,8).map(([,c]) => parseInt(c)), backgroundColor: COLORES.azul + 'cc', hoverBackgroundColor: COLORES.azul, borderRadius: 4, barThickness: 28 }],
                                }}
                            />
                        </div>
                    </GraficaCard>
                )}

                {/* 16. Fracciones SCP — azulClaro */}
                {datos.fraccionesMasUsadasSCP?.length > 0 && (
                    <GraficaCard titulo="Condiciones más impuestas — S.C.P." subtitulo="Art. 192 CNPP" span2>
                        <div className="est-bar-wrap" style={{ height: Math.max(160, datos.fraccionesMasUsadasSCP.slice(0,8).length * 44 + 40) }}>
                            <Bar
                                options={barHorizOpts()}
                                data={{
                                    labels: datos.fraccionesMasUsadasSCP.slice(0,8).map(([f]) => `Cond. ${f}`),
                                    datasets: [{ label: 'Veces impuesta', data: datos.fraccionesMasUsadasSCP.slice(0,8).map(([,c]) => parseInt(c)), backgroundColor: COLORES.azulClaro + 'cc', hoverBackgroundColor: COLORES.azulClaro, borderRadius: 4, barThickness: 28 }],
                                }}
                            />
                        </div>
                    </GraficaCard>
                )}

            </div>

            </div>{/* fin opacity wrapper */}
        </div>
    );
};

export default Estadisticas;
