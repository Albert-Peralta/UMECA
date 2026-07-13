import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, ArcElement,
    Title, Tooltip, Legend, LineElement, PointElement, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { getEstadisticas, exportarEstadisticasExcel } from '../api/estadisticasApi';
import { getConsultas } from '../api/consultasApi';
import './Estadisticas.css';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, ArcElement,
    Title, Tooltip, Legend, LineElement, PointElement, Filler
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
    },
    elements: {
        arc: { borderWidth: 0, hoverOffset: 8 },
    },
};

const dDataset = (data, backgroundColor) => ({
    data, backgroundColor, borderWidth: 0, spacing: 2, borderRadius: 4,
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
    const [anio,       setAnio]       = useState(anioActual);
    const [mes,        setMes]        = useState(0);
    const [semana,     setSemana]     = useState(0);
    const [datos,      setDatos]      = useState(null);
    const [cargando,   setCargando]   = useState(true);
    const [exportando, setExportando] = useState(false);
    const [consultas,  setConsultas]  = useState([]);

    const handleExportar = async () => {
        setExportando(true);
        try {
            const res = await exportarEstadisticasExcel(anio, mes);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `estadisticas_${anio}${mes > 0 ? '_mes' + mes : ''}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            // silenced
        } finally {
            setExportando(false);
        }
    };

    useEffect(() => {
        setCargando(true);
        getEstadisticas(anio, mes, semana)
            .then(r => { if (r.data.ok) setDatos(r.data.data); })
            .catch(console.error)
            .finally(() => setCargando(false));
    }, [anio, mes, semana]);

    useEffect(() => {
        getConsultas()
            .then(r => { if (r.data.ok) setConsultas(r.data.data || []); })
            .catch(err => console.warn("Error al cargar datos:", err));
    }, []);

    // Filtra consultas según anio/mes/semana seleccionados
    const consultasFiltradas = useMemo(() => {
        return consultas.filter(c => {
            if (!c.fechaSolicitud) return false;
            const fecha = new Date(c.fechaSolicitud);
            if (fecha.getFullYear() !== anio) return false;
            if (mes > 0 && fecha.getMonth() + 1 !== mes) return false;
            if (semana > 0) {
                const dia = fecha.getDate();
                const semanaConsulta = dia <= 7 ? 1 : dia <= 14 ? 2 : dia <= 21 ? 3 : 4;
                if (semanaConsulta !== semana) return false;
            }
            return true;
        });
    }, [consultas, anio, mes, semana]);

    const consultasPos = useMemo(() => consultasFiltradas.filter(c => c.resultado === 'POSITIVO').length, [consultasFiltradas]);
    const consultasNeg = useMemo(() => consultasFiltradas.filter(c => c.resultado === 'NEGATIVO').length, [consultasFiltradas]);

    const anios = Array.from({ length: 5 }, (_, i) => anioActual - i);

    if (cargando) return <div className="est-cargando"><i className="bi bi-arrow-repeat" /> Cargando estadísticas...</div>;
    if (!datos)   return <div className="est-cargando">No se pudieron cargar los datos.</div>;

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

    const total   = arr => arr.reduce((a, b) => a + b, 0);
    const promedio = arr => { const t = total(arr); return t === 0 ? 0 : Math.round(t / arr.filter(v => v > 0).length); };
    const maximo   = arr => Math.max(...arr);

    const subtituloFiltro = semana > 0
        ? `Semana ${semana} · ${MESES_FULL[mes]} ${anio}`
        : mes > 0
            ? `${MESES_FULL[mes]} ${anio}`
            : `Año ${anio}`;

    return (
        <div className="est-wrapper">

            {/* ── Filtros año + mes ── */}
            <div className="est-header">
                <h2 className="est-titulo">VISTA GENERAL — ESTADÍSTICAS</h2>
                <div className="est-filtros">
                    <div className="est-filtro-grupo">
                        <label className="est-filtro-label"><i className="bi bi-calendar3" /> Año</label>
                        <select
                            className="est-mes-sel"
                            value={anio}
                            onChange={e => setAnio(Number(e.target.value))}>
                            {anios.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                    <div className="est-filtro-grupo">
                        <label className="est-filtro-label"><i className="bi bi-calendar-month" /> Mes</label>
                        <select
                            className="est-mes-sel"
                            value={mes}
                            onChange={e => { setMes(Number(e.target.value)); setSemana(0); }}>
                            {MESES_FULL.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                    </div>
                    {mes > 0 && (
                        <div className="est-filtro-grupo">
                            <label className="est-filtro-label"><i className="bi bi-calendar-week" /> Semana</label>
                            <select
                                className="est-mes-sel"
                                value={semana}
                                onChange={e => setSemana(Number(e.target.value))}>
                                <option value={0}>Todas</option>
                                <option value={1}>Semana 1 (1–7)</option>
                                <option value={2}>Semana 2 (8–14)</option>
                                <option value={3}>Semana 3 (15–21)</option>
                                <option value={4}>Semana 4 (22–fin)</option>
                            </select>
                        </div>
                    )}
                    <div className="est-filtro-grupo" style={{ alignSelf: 'flex-end' }}>
                        <button className="est-btn-exportar" onClick={handleExportar} disabled={exportando} title="Exportar a Excel">
                            {exportando
                                ? <><i className="bi bi-arrow-repeat est-spin" /> Exportando...</>
                                : <><i className="bi bi-file-earmark-excel-fill" /> Exportar Excel</>
                            }
                        </button>
                    </div>
                </div>
            </div>

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
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Medida Cautelar', 'Susp. Condicional'],
                            datasets: [dDataset(
                                [datos.medidasPorTipo?.MEDIDA_CAUTELAR, datos.medidasPorTipo?.SUSPENSION_CONDICIONAL],
                                [COLORES.azul, COLORES.azulClaro]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.azul }}><strong>{datos.medidasPorTipo?.MEDIDA_CAUTELAR}</strong> M.C.</span>
                        <span style={{ color: COLORES.azulClaro }}><strong>{datos.medidasPorTipo?.SUSPENSION_CONDICIONAL}</strong> S.C.P.</span>
                    </div>
                </GraficaCard>

                {/* 2. Estado de medidas — semáforo: verde · ámbar · gris · azulClaro · rojo */}
                <GraficaCard id="chart-medidas-estado" titulo="Estado de Medidas" subtitulo={`Medidas en curso · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Activo', 'Suspendido', 'Finalizado'],
                            datasets: [dDataset(
                                [datos.medidasPorEstado?.ACTIVO, datos.medidasPorEstado?.SUSPENDIDO, datos.medidasPorEstado?.FINALIZADO],
                                [COLORES.verdeClaro, COLORES.amarillo, COLORES.gris]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.verdeClaro }}><strong>{datos.medidasPorEstado?.ACTIVO}</strong> Activo</span>
                        <span style={{ color: COLORES.amarillo }}><strong>{datos.medidasPorEstado?.SUSPENDIDO}</strong> Susp.</span>
                        <span style={{ color: COLORES.gris }}><strong>{datos.medidasPorEstado?.FINALIZADO}</strong> Final.</span>
                    </div>
                </GraficaCard>

                {/* 3. Resoluciones — azulClaro (MC→SCP) · verde oscuro (levantados) · rojo (revocados) */}
                <GraficaCard id="chart-resoluciones" titulo="Resoluciones de Medidas" subtitulo={`MC→SCP · Levantamientos · Revocados · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['MC → SCP', 'Levantados', 'Revocados'],
                            datasets: [dDataset(
                                [datos.cambiadoAScp, datos.levantamientos, datos.revocados],
                                [COLORES.azulClaro, COLORES.verde, COLORES.rojo]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.azulClaro }}><strong>{datos.cambiadoAScp ?? 0}</strong> MC→SCP</span>
                        <span style={{ color: COLORES.verde }}><strong>{datos.levantamientos ?? 0}</strong> Levantados</span>
                        <span style={{ color: COLORES.rojo }}><strong>{datos.revocados ?? 0}</strong> Revocados</span>
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-check2-circle" label="Cumplimiento" />

                {/* Cumplimiento MC — verde (cumpliendo) · rojo (incumpliendo) */}
                <GraficaCard id="chart-cumplimiento-mc" titulo="Cumplimiento M.C." subtitulo={`Medidas Cautelares · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Cumpliendo', 'Incumpliendo'],
                            datasets: [dDataset(
                                [datos.cumplimientoMC?.CUMPLIENDO, datos.cumplimientoMC?.INCUMPLIENDO],
                                [COLORES.verde, COLORES.rojo]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.verde }}><strong>{datos.cumplimientoMC?.CUMPLIENDO}</strong> Cumpliendo</span>
                        <span style={{ color: COLORES.rojo }}><strong>{datos.cumplimientoMC?.INCUMPLIENDO}</strong> Incumpliendo</span>
                    </div>
                </GraficaCard>

                {/* 5. Cumplimiento SCP — verde (cumpliendo) · rojo (incumpliendo) — misma escala que MC */}
                <GraficaCard id="chart-cumplimiento-scp" titulo="Cumplimiento S.C.P." subtitulo={`Suspensión Condicional · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Cumpliendo', 'Incumpliendo'],
                            datasets: [dDataset(
                                [datos.cumplimientoSCP?.CUMPLIENDO, datos.cumplimientoSCP?.INCUMPLIENDO],
                                [COLORES.verde, COLORES.rojo]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.verde }}><strong>{datos.cumplimientoSCP?.CUMPLIENDO}</strong> Cumpliendo</span>
                        <span style={{ color: COLORES.rojo }}><strong>{datos.cumplimientoSCP?.INCUMPLIENDO}</strong> Incumpliendo</span>
                    </div>
                </GraficaCard>

                {/* 6. Entrevistas por tipo — azul · azulClaro · gris (misma paleta medidas) */}
                <GraficaCard id="chart-entrevistas" titulo="Entrevistas de Encuadre" subtitulo={`Tipo de seguimiento · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Medida Cautelar','S.C.P.','Sin asignar'],
                            datasets: [dDataset(
                                [datos.entrevistasPorTipo?.MC, datos.entrevistasPorTipo?.SCP, datos.entrevistasPorTipo?.SIN_ASIGNAR],
                                [COLORES.azul, COLORES.azulClaro, COLORES.gris]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.azul }}><strong>{datos.entrevistasPorTipo?.MC}</strong> MC</span>
                        <span style={{ color: COLORES.azulClaro }}><strong>{datos.entrevistasPorTipo?.SCP}</strong> SCP</span>
                        <span style={{ color: COLORES.gris }}><strong>{datos.entrevistasPorTipo?.SIN_ASIGNAR}</strong> Sin asig.</span>
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-telephone-fill" label="Supervisión en Libertad" />

                {/* Tipo supervisión — morado (llamadas) · naranja (visitas) */}
                <GraficaCard id="chart-sup-tipo" titulo="Tipo de Supervisión" subtitulo={`Llamadas vs Visitas · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Llamadas', 'Visitas domiciliarias'],
                            datasets: [dDataset(
                                [datos.supervisionesPorTipo?.LLAMADA, datos.supervisionesPorTipo?.VISITA_DOMICILIARIA],
                                [COLORES.morado, COLORES.naranja]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.morado }}><strong>{datos.supervisionesPorTipo?.LLAMADA}</strong> Llamadas</span>
                        <span style={{ color: COLORES.naranja }}><strong>{datos.supervisionesPorTipo?.VISITA_DOMICILIARIA}</strong> Visitas</span>
                    </div>
                </GraficaCard>

                {/* 8. Estado supervisiones — ámbar · verde · gris · rojo */}
                <GraficaCard id="chart-sup-estado" titulo="Estado de Supervisiones" subtitulo={`Distribución por estado · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Pendiente','Realizada','No contactado','Cancelada'],
                            datasets: [dDataset(
                                [datos.supervisionesPorEstado?.PENDIENTE, datos.supervisionesPorEstado?.REALIZADA, datos.supervisionesPorEstado?.NO_CONTACTADO, datos.supervisionesPorEstado?.CANCELADA],
                                [COLORES.amarillo, COLORES.verdeClaro, COLORES.gris, COLORES.rojo]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.amarillo }}><strong>{datos.supervisionesPorEstado?.PENDIENTE}</strong> Pend.</span>
                        <span style={{ color: COLORES.verdeClaro }}><strong>{datos.supervisionesPorEstado?.REALIZADA}</strong> Real.</span>
                        <span style={{ color: COLORES.gris }}><strong>{datos.supervisionesPorEstado?.NO_CONTACTADO}</strong> N/C</span>
                        <span style={{ color: COLORES.rojo }}><strong>{datos.supervisionesPorEstado?.CANCELADA}</strong> Canc.</span>
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-people-fill" label="Distribución por Género" />

                {/* Género MC — azul · naranja · morado · gris */}
                <GraficaCard id="chart-genero-mc" titulo="Género — M.C." subtitulo={`Medidas Cautelares por género · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Masculino', 'Femenino', 'No binario', 'Sin dato'],
                            datasets: [dDataset(
                                [datos.generoPorMC?.Masculino, datos.generoPorMC?.Femenino, datos.generoPorMC?.['No binario'], datos.generoPorMC?.['Sin dato']],
                                [COLORES.azul, COLORES.naranja, COLORES.morado, COLORES.gris]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.azul }}><strong>{datos.generoPorMC?.Masculino ?? 0}</strong> Masc.</span>
                        <span style={{ color: COLORES.naranja }}><strong>{datos.generoPorMC?.Femenino ?? 0}</strong> Fem.</span>
                        <span style={{ color: COLORES.morado }}><strong>{datos.generoPorMC?.['No binario'] ?? 0}</strong> N.B.</span>
                    </div>
                </GraficaCard>

                {/* 10. Género SCP — misma paleta que MC */}
                <GraficaCard id="chart-genero-scp" titulo="Género — S.C.P." subtitulo={`Suspensión Condicional por género · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Masculino', 'Femenino', 'No binario', 'Sin dato'],
                            datasets: [dDataset(
                                [datos.generoPorSCP?.Masculino, datos.generoPorSCP?.Femenino, datos.generoPorSCP?.['No binario'], datos.generoPorSCP?.['Sin dato']],
                                [COLORES.azul, COLORES.naranja, COLORES.morado, COLORES.gris]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.azul }}><strong>{datos.generoPorSCP?.Masculino ?? 0}</strong> Masc.</span>
                        <span style={{ color: COLORES.naranja }}><strong>{datos.generoPorSCP?.Femenino ?? 0}</strong> Fem.</span>
                        <span style={{ color: COLORES.morado }}><strong>{datos.generoPorSCP?.['No binario'] ?? 0}</strong> N.B.</span>
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-search" label="Consultas de Antecedentes" />

                {/* Consultas Positivas vs Negativas */}
                <GraficaCard id="chart-consultas" titulo="Consultas de Antecedentes" subtitulo={`Positivas vs Negativas · ${subtituloFiltro}`}>
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Positivas', 'Negativas'],
                            datasets: [dDataset(
                                [consultasPos, consultasNeg],
                                [COLORES.verde, COLORES.rojo]
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: COLORES.verde }}><strong>{consultasPos}</strong> Positivas</span>
                        <span style={{ color: COLORES.rojo }}><strong>{consultasNeg}</strong> Negativas</span>
                    </div>
                </GraficaCard>

                <Seccion icono="bi bi-person-x-fill" label="Fallecidos" />

                {/* Fallecidos — imputados activos vs fallecidos (totales acumulados) */}
                <GraficaCard id="chart-fallecidos" titulo="Fallecidos" subtitulo="Imputados activos vs fallecidos · Total acumulado">
                    <div className="est-dona-wrap">
                        <Doughnut options={doughnutOpts} data={{
                            labels: ['Activos', 'Fallecidos'],
                            datasets: [dDataset(
                                [datos.totalActivos ?? 0, datos.totalFallecidos ?? 0],
                                ['#d1d5db', '#374151']
                            )],
                        }} />
                    </div>
                    <div className="est-dona-stats">
                        <span style={{ color: '#6b7280' }}><strong>{datos.totalActivos ?? 0}</strong> Activos</span>
                        <span style={{ color: '#374151' }}><strong>{datos.totalFallecidos ?? 0}</strong> Fallecidos</span>
                    </div>
                </GraficaCard>

                {/* 12. Fallecidos por mes — barra wide, gris oscuro */}
                <GraficaCard id="chart-fallecidos-mes" titulo="Fallecidos por Mes" subtitulo={`Registro de fallecimientos por mes · ${anio}`} span2>
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
                <GraficaCard id="chart-tta" titulo="Programa TTA por Mes" subtitulo={`Personas en Tratamiento y Terapias Ambulatorias · ${anio}`} span2>
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
                <GraficaCard id="chart-medidas-mes" titulo="Registros de Medidas / S.C.P." subtitulo={`Nuevos registros por mes · ${anio}`} span2>
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

                {/* 12. Resoluciones por mes — azulClaro · verde · rojo */}
                <GraficaCard id="chart-resoluciones-mes" titulo="Resoluciones por Mes" subtitulo={`MC→SCP · Levantamientos · Revocados · ${anio}`} span2>
                    <div className="est-bar-stats">
                        <span><strong>{total(mesesScpCambio)}</strong> MC→SCP</span>
                        <span><strong>{total(mesesLevantado)}</strong> Levantados</span>
                        <span><strong>{total(mesesRevocado)}</strong> Revocados</span>
                    </div>
                    <div className="est-bar-wrap">
                        <Bar options={barOpts()} data={{
                            labels: MESES,
                            datasets: [
                                { label: 'MC → SCP',   data: mesesScpCambio, backgroundColor: COLORES.azulClaro + 'cc', hoverBackgroundColor: COLORES.azulClaro, borderRadius: 4 },
                                { label: 'Levantados', data: mesesLevantado, backgroundColor: COLORES.verde + 'cc',     hoverBackgroundColor: COLORES.verde,      borderRadius: 4 },
                                { label: 'Revocados',  data: mesesRevocado,  backgroundColor: COLORES.rojo + 'cc',      hoverBackgroundColor: COLORES.rojo,       borderRadius: 4 },
                            ],
                        }} />
                    </div>
                </GraficaCard>

                {/* 13. Supervisiones por mes — morado · naranja */}
                <GraficaCard id="chart-supervisiones-mes" titulo="Supervisión en Libertad" subtitulo={`Llamadas y visitas por mes · ${anio}`} span2>
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
                <GraficaCard id="chart-evaluaciones" titulo="Evaluaciones de Riesgo" subtitulo={`Evaluaciones realizadas por mes · ${anio}`} span2>
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
                        <div className="est-bar-wrap" style={{ height: 240 }}>
                            <Bar
                                options={barHorizOpts()}
                                data={{
                                    labels: datos.fraccionesMasUsadasMC.slice(0,8).map(([f]) => `Fracc. ${f}`),
                                    datasets: [{ label: 'Veces impuesta', data: datos.fraccionesMasUsadasMC.slice(0,8).map(([,c]) => parseInt(c)), backgroundColor: COLORES.azul + 'cc', hoverBackgroundColor: COLORES.azul, borderRadius: 4 }],
                                }}
                            />
                        </div>
                    </GraficaCard>
                )}

                {/* 16. Fracciones SCP — azulClaro */}
                {datos.fraccionesMasUsadasSCP?.length > 0 && (
                    <GraficaCard titulo="Condiciones más impuestas — S.C.P." subtitulo="Art. 192 CNPP" span2>
                        <div className="est-bar-wrap" style={{ height: 240 }}>
                            <Bar
                                options={barHorizOpts()}
                                data={{
                                    labels: datos.fraccionesMasUsadasSCP.slice(0,8).map(([f]) => `Cond. ${f}`),
                                    datasets: [{ label: 'Veces impuesta', data: datos.fraccionesMasUsadasSCP.slice(0,8).map(([,c]) => parseInt(c)), backgroundColor: COLORES.azulClaro + 'cc', hoverBackgroundColor: COLORES.azulClaro, borderRadius: 4 }],
                                }}
                            />
                        </div>
                    </GraficaCard>
                )}

            </div>
        </div>
    );
};

export default Estadisticas;
