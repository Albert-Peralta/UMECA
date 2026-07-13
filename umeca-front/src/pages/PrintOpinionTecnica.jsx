import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';



import logoMorelos  from '../assets/logo-morelos-nuevo.png';
import footerDorado from '../assets/footer-dorado.png';
import './PrintEvalDocs.css';

const EditorToolbar = ({ editor }) => {
    if (!editor) return null;
    return (
        <div className="ped-editor-toolbar">
            <button onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'active' : ''} title="Negrita">
                <i className="bi bi-type-bold" />
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'active' : ''} title="Cursiva">
                <i className="bi bi-type-italic" />
            </button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={editor.isActive('underline') ? 'active' : ''} title="Subrayado">
                <i className="bi bi-type-underline" />
            </button>
            <div className="ped-tb-sep" />
            <button onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''} title="Izquierda">
                <i className="bi bi-text-left" />
            </button>
            <button onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''} title="Centrar">
                <i className="bi bi-text-center" />
            </button>
            <button onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''} title="Derecha">
                <i className="bi bi-text-right" />
            </button>
            <button onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={editor.isActive({ textAlign: 'justify' }) ? 'active' : ''} title="Justificar">
                <i className="bi bi-justify" />
            </button>
            <div className="ped-tb-sep" />
            <button onClick={() => editor.chain().focus().setParagraph().run()} title="Párrafo normal">
                <i className="bi bi-paragraph" />
            </button>
        </div>
    );
};

const val = (v, fallback = '[Sin dato]') => (v && String(v).trim()) || fallback;

const resultadoTexto = {
    FLEXIBLE:        'BAJO RIESGO PROCESAL (FLEXIBLE)',
    ESTRICTO:        'MEDIANO RIESGO PROCESAL (ESTRICTO)',
    DIFICIL_CUMPLIR: 'ALTO RIESGO PROCESAL (DIFÍCIL DE CUMPLIR)',
};

const PrintOpinionTecnica = ({ evaluacion: d, onCerrar }) => {
    const docRef = useRef(null);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [guardadoEn, setGuardadoEn] = useState(null);
    const storageKey = `umeca-doc-opinion-${d?.id || d?.causaPenal || 'nuevo'}`;

    const anio  = new Date().getFullYear();
    const mes   = String(new Date().getMonth() + 1).padStart(2, '0');
    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const numOficio = `SSyPC/CSP/DGRS/DUMCySA/[NUM]/${mes}/${anio}`;

    const nombreImp = [d.nombreImputado, d.apPaternoImputado, d.apMaternoImputado]
                        .filter(Boolean).join(' ') || d.nombreCompletoImputado || '';

    const resultado = d.resultado ? (resultadoTexto[d.resultado] || d.resultado) : '[RESULTADO]';

    const domicilioLinea = () => {
        const partes = [d.domicilioActualCalle, d.domicilioActualNo, d.domicilioActualColonia,
                        d.domicilioActualMunicipio, d.domicilioActualEstado].filter(Boolean);
        return partes.length ? partes.join(', ') + '.' : '[Sin dato]';
    };

    const tablaIdent = `
<table>
  <tbody>
    <tr>
      <th>NOMBRE DEL ENTREVISTADO</th>
      <td>${val(nombreImp).toUpperCase()}</td>
      <th>EDAD</th>
      <td>${val(d.edad)} AÑOS.</td>
    </tr>
    <tr>
      <th>CARPETA DE INVESTIGACIÓN</th>
      <td>${val(d.causaPenal)}</td>
      <th>FISCALÍA</th>
      <td>${val(d.dependencia || d.cargo)}</td>
    </tr>
    <tr>
      <th>FECHA DE LA ENTREVISTA</th>
      <td>${val(d.fechaSolicitud)}</td>
      <th>HORA</th>
      <td>${val(d.horaInicio)} HRS.</td>
    </tr>
    <tr>
      <th>LUGAR DONDE SE REALIZÓ LA ENTREVISTA</th>
      <td colspan="3">${val(d.lugarEntrevista)}</td>
    </tr>
  </tbody>
</table>`;

    const tablaSocio = `
<table>
  <tbody>
    <tr>
      <th style="width:28%">FACTOR</th>
      <th colspan="3">DATOS SOCIO-AMBIENTALES</th>
    </tr>
    <tr>
      <td><strong>Datos generales</strong><br/>(según lo manifestó)</td>
      <td colspan="3">
        <strong>Nombre:</strong> ${val(nombreImp)}.<br/>
        <strong>Fecha de Nacimiento:</strong> ${val(d.fechaNacimiento)}.<br/>
        <strong>Lugar de Nacimiento:</strong> ${val(d.estadoNacimiento)}.<br/>
        <strong>Edad:</strong> ${val(d.edad)} años.<br/>
        <strong>CURP:</strong> ${val(d.curp)}.<br/>
        <strong>Estado civil:</strong> ${val(d.estadoCivil)}.<br/>
        <strong>Escolaridad:</strong> ${val(d.gradoEstudios)}.<br/>
        <strong>Enfermedad:</strong> [Sin dato].<br/>
        <strong>Oficio/Profesión:</strong> [Sin dato].
      </td>
    </tr>
    <tr>
      <td><strong>Domicilio Actual o primario</strong><br/>(según lo manifestó)</td>
      <td>${domicilioLinea()}</td><td style="width:22%"><strong>Temporalidad</strong></td><td style="width:18%">${val(d.tiempoEnDomicilio)}</td>
    </tr>
    <tr>
      <td><strong>Domicilio secundario</strong><br/>(según lo manifestó)</td>
      <td colspan="2">${d.calleSecundaria ? [d.calleSecundaria, d.coloniaSecundaria, d.municipioSecundario].filter(Boolean).join(', ') : 'No aplica.'}</td><td><strong>Temporalidad</strong><br/>No aplica.</td>
    </tr>
    <tr>
      <td><strong>Domicilios anteriores</strong><br/>(Según lo manifestó)</td>
      <td colspan="2">[Sin dato]</td><td><strong>Temporalidad</strong><br/>[Sin dato]</td>
    </tr>
    <tr>
      <td><strong>Datos Familiares</strong><br/>(según lo manifestó)</td>
      <td colspan="2">[Descripción de con quién vive el entrevistado]</td>
      <td><strong>Tiempo de cohabitar</strong><br/>[Sin dato]</td>
    </tr>
    <tr>
      <td><strong>Cuenta con familiares fuera del estado y/o país</strong></td>
      <td colspan="2">[Sin dato]</td>
      <td><strong>Cuenta con documentos migratorios</strong><br/>${d.tieneVisa || d.tienePasaporte ? 'Sí.' : 'No tiene.'}</td>
    </tr>
    <tr>
      <td><strong>Propietario de la Vivienda</strong><br/>(según lo manifestó)</td>
      <td><strong>Rentada</strong><br/>${d.tipoDomicilioActual === 'Arrendado' ? 'Sí.' : 'No aplica.'}</td>
      <td><strong>Propia</strong><br/>${d.tipoDomicilioActual === 'Propia' ? 'Sí.' : 'No aplica.'}</td>
      <td><strong>Prestada</strong><br/>${d.tipoDomicilioActual === 'Prestado' ? 'Sí.' : 'No aplica.'}</td>
    </tr>
    <tr>
      <td><strong>Actividad Laboral/Escolar Actual y Temporalidad</strong><br/>(según lo manifestó)</td>
      <td colspan="2">[Sin dato]</td>
      <td><strong>Salario</strong><br/>[Sin dato]</td>
    </tr>
    <tr>
      <td><strong>Delito por el que se le procesa</strong><br/>(Carpeta de investigación)</td>
      <td colspan="3">${val(d.delito)}<br/>(${d.nombreSolicitante ? `Oficio de petición de ${d.nombreSolicitante}` : 'Oficio de petición del Agente del Ministerio Público'})</td>
    </tr>
    <tr>
      <td><strong>Comportamiento en procesos anteriores</strong></td>
      <td><strong>En la base de datos de la UMECA</strong><br/>Sin registros.</td>
      <td colspan="2"><strong>Carpeta de investigación</strong><br/>Sin acceso a la carpeta de investigación.</td>
    </tr>
    <tr>
      <td><strong>Información sobre la Víctima</strong></td>
      <td colspan="3">Sin Dato.<br/>(${d.nombreSolicitante ? `Oficio de petición de ${d.nombreSolicitante}` : 'Oficio de petición del Agente del Ministerio Público'})</td>
    </tr>
    <tr>
      <td><strong>Consumo de Sustancias</strong><br/>(según lo manifestó) Antes</td>
      <td colspan="3">[Sin dato]</td>
    </tr>
    <tr>
      <td><strong>Desde cuando las consume</strong><br/>(según lo manifestó)</td>
      <td colspan="3">Sin dato.</td>
    </tr>
  </tbody>
</table>`;

    const contenidoInicial = `
<p style="text-align:right">${d.lugarEntrevista ? d.lugarEntrevista.split(',')[0] : 'Cuernavaca'}, Morelos; a ${fecha}</p>
<p style="text-align:right"><em>"${anio}, año de Margarita Maza Parada"</em><br/>
<strong>ASUNTO: Informe sobre la Evaluación de Riesgos Procesales</strong></p>

<p><strong>${val(d.nombreSolicitante, 'AGENTE DEL MINISTERIO PÚBLICO').toUpperCase()}</strong><br/>
${val(d.cargo, 'AGENTE DEL MINISTERIO PÚBLICO').toUpperCase()}<br/>
P R E S E N T E.</p>

<p style="text-align:justify">En Atención al escrito realizado ${d.nombreSolicitante ? `por ${d.cargo || 'el solicitante'}` : 'por la defensa particular'}; Mediante el cual solicita evaluación de Riesgos Procesales y con fundamento en lo dispuesto por los numerales 105 Fracción VIII, 156, 164, 168, 169, 170 y 176 del Código Nacional de Procedimientos Penales; se emite lo siguiente:</p>

<p><strong>DATOS GENERALES REFERIDOS POR EL ENTREVISTADO, LOS CUALES FUERON VERIFICADOS CON LAS FUENTES DE VERIFICACIÓN CORRESPONDIENTES:</strong></p>

${tablaIdent}

${tablaSocio}

<p style="text-align:justify"><strong>OBSERVACIONES:</strong><br/>Al momento de realizar la entrevista, personal de la Unidad le explicó a la persona privada de la libertad el motivo de la misma, así como la importancia de proporcionar números telefónicos para el cotejo de la información recabada.</p>
<p style="text-align:justify">[Descripción del proceso de verificación, fuentes contactadas y resultados obtenidos.]</p>

<p style="text-align:justify">Con base en la información recabada y verificada, la Dirección de la Unidad de Medidas Cautelares y Salidas Alternas para adultos <strong>EMITE OPINIÓN TÉCNICA DE EVALUACIÓN DE RIESGOS PROCESALES</strong>, determinando que la persona evaluada presenta un nivel de: <strong>${resultado}.</strong></p>

<p style="text-align:center"><strong>A T E N T A M E N T E</strong></p>
    `.trim();

    const handleImprimir = async () => {
        setImprimiendo(true);
        try {
            const html2pdf  = (await import('html2pdf.js')).default;
            const el        = docRef.current;
            const footerEl  = el.querySelector('.ped-footer');

            const prevWidth     = el.style.width;
            const prevMargin    = el.style.margin;
            const prevBoxShadow = el.style.boxShadow;
            const prevPadding   = el.style.padding;

            el.style.width     = '720px';
            el.style.margin    = '0';
            el.style.boxShadow = 'none';
            el.style.padding   = '14px 22px';

            if (footerEl) {
                el.getBoundingClientRect();
                const gap = Math.max(20, 1320 - el.scrollHeight);
                footerEl.style.marginTop = gap + 'px';
            }

            const blobUrl = await html2pdf()
                .set({
                    margin:      [6, 14, 10, 14],
                    image:       { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 720 },
                    jsPDF:       { unit: 'mm', format: 'legal', orientation: 'portrait' },
                    pagebreak:   { mode: 'avoid-all' },
                })
                .from(el)
                .output('bloburl');

            if (footerEl) footerEl.style.marginTop = '';
            el.style.width     = prevWidth;
            el.style.margin    = prevMargin;
            el.style.boxShadow = prevBoxShadow;
            el.style.padding   = prevPadding;

            window.open(blobUrl, '_blank');
        } catch (err) {
            console.error('Error al preparar impresión:', err);
        } finally {
            setImprimiendo(false);
        }
    };

    const savedContent = localStorage.getItem(storageKey);
    const savedMeta    = localStorage.getItem(storageKey + '-meta');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Table.configure({ resizable: false }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: savedContent || contenidoInicial,
        onUpdate: ({ editor }) => {
            localStorage.setItem(storageKey, editor.getHTML());
            const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem(storageKey + '-meta', ahora);
            setGuardadoEn(ahora);
        },
    });

    useEffect(() => {
        if (savedMeta) setGuardadoEn(savedMeta);
    }, []);

    const handleRestaurar = useCallback(() => {
        if (!window.confirm('¿Restaurar el documento original? Se perderán los cambios editados.')) return;
        localStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey + '-meta');
        editor?.commands.setContent(contenidoInicial);
        setGuardadoEn(null);
    }, [editor, contenidoInicial, storageKey]);

    return createPortal(
        <div className="ped-overlay">

            <div className="ped-toolbar">
                <span className="ped-toolbar-title">
                    <i className="bi bi-file-earmark-check" /> Opinión Técnica
                    <span className="ped-toolbar-hint">Edita el contenido directamente en el documento</span>
                </span>
                <div className="ped-toolbar-actions">
                    {guardadoEn && (
                        <span style={{ fontSize: 11, color: '#a8d5a2', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-cloud-check" /> Guardado {guardadoEn}
                        </span>
                    )}
                    <button className="ped-btn-cerrar" style={{ background: 'rgba(255,255,255,.12)', fontSize: 12 }} onClick={handleRestaurar} title="Restaurar texto original">
                        <i className="bi bi-arrow-counterclockwise" /> Restaurar
                    </button>
                    <button className="ped-btn-cerrar" onClick={onCerrar}>
                        <i className="bi bi-x-lg" /> Cerrar
                    </button>
                    <button className="ped-btn-imprimir" onClick={handleImprimir} disabled={imprimiendo}>
                        {imprimiendo
                            ? <><i className="bi bi-arrow-repeat ped-spin" /> Preparando...</>
                            : <><i className="bi bi-printer-fill" /> Imprimir / PDF</>}
                    </button>
                </div>
            </div>

            <EditorToolbar editor={editor} />

            <div className="ped-documento" ref={docRef}>

                <div className="ped-header">
                    <img src={logoMorelos} alt="Morelos" className="ped-logo" />
                    <div
                        className="ped-header-deps ped-editable-deps"
                        contentEditable
                        suppressContentEditableWarning
                    >
                        <p>Secretaría de Seguridad y Protección Ciudadana</p>
                        <p>Coordinación del Sistema Penitenciario</p>
                        <p>Dirección General de Reinserción Social</p>
                        <p>Dirección de la Unidad de Medidas Cautelares</p>
                        <p>y Salidas Alternas para Adultos</p>
                        <p className="ped-num-oficio">{numOficio}</p>
                    </div>
                </div>

                <EditorContent editor={editor} className="ped-editor-wrap" />

                <div className="ped-firma ped-editable-deps" contentEditable suppressContentEditableWarning>
                    <div className="ped-firma-linea" />
                    <p className="ped-firma-nombre">LIC. REY GIOVANNI RIVAS SANDOVAL</p>
                    <p className="ped-firma-cargo">DIRECTOR DE LA UNIDAD DE MEDIDAS CAUTELARES</p>
                    <p className="ped-firma-cargo">Y SALIDAS ALTERNAS PARA ADULTOS.</p>
                </div>

                <div className="ped-elab-row ped-editable-deps" contentEditable suppressContentEditableWarning>
                    <div className="ped-elab-item">
                        <p className="ped-elab-label">ELABORÓ:</p>
                        <p className="ped-elab-nombre">LIC. M.A.A.</p>
                    </div>
                    <div className="ped-elab-item">
                        <p className="ped-elab-label">REVISÓ:</p>
                        <p className="ped-elab-nombre">LIC. A.P.A.</p>
                    </div>
                    <div className="ped-elab-item">
                        <p className="ped-elab-label">AUTORIZÓ:</p>
                        <p className="ped-elab-nombre">LIC. M.A.A.</p>
                    </div>
                </div>

                <p className="ped-ccp ped-editable-deps" contentEditable suppressContentEditableWarning>c.c.p.- Instituto de la Defensoría Pública del Estado de Morelos. Para su conocimiento.</p>

                <div className="ped-footer">
                    <img src={footerDorado} alt="" className="ped-footer-img" />
                    <p className="ped-footer-fecha">Documento generado el {new Date().toLocaleString('es-MX')}</p>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default PrintOpinionTecnica;
