import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import logoMorelos  from '../assets/logo-morelos-nuevo.png';
import footerDorado from '../assets/footer-dorado.png';
import './PrintOficioMigracion.css';

/* ── Barra de herramientas del editor ── */
const EditorToolbar = ({ editor }) => {
    if (!editor) return null;
    return (
        <div className="pom-editor-toolbar no-print">
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
            <div className="pom-tb-sep" />
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
            <div className="pom-tb-sep" />
            <button onClick={() => editor.chain().focus().setParagraph().run()} title="Párrafo normal">
                <i className="bi bi-paragraph" />
            </button>
        </div>
    );
};

/* ── Componente principal ── */
const PrintOficioMigracion = ({ medida, detalleV, onCerrar }) => {
    const m    = medida  || {};
    const detV = detalleV || {};

    const fecha           = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const ambito          = detV.ambitoTerritorial || 'País';
    const especificacion  = detV.especificacion  || '';
    const procedimiento   = detV.procedimiento   || '';
    const anio            = new Date().getFullYear();
    const numOficio       = `UMECA/MC/${(m.causaPenal || '').replace(/\//g, '-')}/${anio}`;
    const nombreImp       = [m.nombreImputado, m.apPaternoImputado, m.apMaternoImputado]
                                .filter(Boolean).join(' ') || m.nombreImputado || '';

    const docRef         = useRef(null);
    const [imprimiendo, setImprimiendo] = useState(false);

    /* ── Contenido inicial editable ── */
    const contenidoInicial = `
<p style="text-align:right">Cuernavaca, Morelos, a ${fecha}</p>

<p><strong>DELEGADO ESTATAL</strong><br/>
<strong>INSTITUTO NACIONAL DE MIGRACIÓN</strong><br/>
<strong>DELEGACIÓN MORELOS</strong><br/>
P R E S E N T E</p>

<p><strong>ASUNTO:</strong> Notificación de Medida Cautelar — Prohibición de Salir del ${ambito} — Art. 155 Fracción V del CNPP.</p>

<p style="text-align:justify">En ejercicio de las atribuciones conferidas a esta Unidad de Medidas Cautelares y Salidas Alternas para Adultos, y en cumplimiento a lo ordenado por el Órgano Jurisdiccional competente, me permito comunicar a Usted lo siguiente:</p>

<p style="text-align:justify">Que dentro de la causa penal número <strong>${m.causaPenal || ''}</strong>, radicada ante el Juzgado de Control correspondiente, se dictó <strong>MEDIDA CAUTELAR</strong> en contra de la persona imputada:</p>

<p style="text-align:center"><strong>${nombreImp.toUpperCase()}</strong></p>

<p style="text-align:justify">Dicha medida consiste en la <strong>PROHIBICIÓN DE SALIR DEL ${ambito.toUpperCase()}</strong> sin autorización judicial previa, de conformidad con el artículo 155, fracción V, del Código Nacional de Procedimientos Penales${especificacion ? `, con la siguiente especificación: <em>${especificacion}</em>.` : `, en los términos que determine el Juez de Control.`}</p>

${procedimiento ? `<p style="text-align:justify">El procedimiento establecido para solicitar autorización de salida es el siguiente: <em>${procedimiento}</em>.</p>` : ''}

<p style="text-align:justify">En virtud de lo anterior, se solicita respetuosamente a esa Delegación que, en el ámbito de sus atribuciones, se sirva <strong>implementar las medidas necesarias para impedir la salida del país</strong> de la persona señalada, así como notificar a esta Unidad en caso de detectarse algún intento de incumplimiento de la medida.</p>

<p style="text-align:justify">Sin otro particular, hago propicia la ocasión para enviarle un cordial saludo.</p>

<p style="text-align:center"><strong>A T E N T A M E N T E</strong></p>
    `.trim();

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: contenidoInicial,
        editorProps: {
            attributes: { class: 'pom-editor-content' },
        },
    });

    /* ── Imprimir / PDF ── */
    const handleImprimir = async () => {
        setImprimiendo(true);
        try {
            const html2pdf  = (await import('html2pdf.js')).default;
            const el        = docRef.current;
            const footerEl  = el.querySelector('.pom-footer');

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
                const elH     = el.scrollHeight;
                const targetH = 994;
                const gap     = Math.max(20, targetH - elH);
                footerEl.style.marginTop = gap + 'px';
            }

            const blobUrl = await html2pdf()
                .set({
                    margin:      [6, 14, 10, 14],
                    image:       { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 720 },
                    jsPDF:       { unit: 'mm', format: 'letter', orientation: 'portrait' },
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

    return createPortal(
        <div className="pom-overlay">

            {/* ── Toolbar principal ── */}
            <div className="pom-toolbar no-print">
                <span className="pom-toolbar-title">
                    <i className="bi bi-file-earmark-text" /> Oficio de Migración — <span className="pom-toolbar-hint">Edita el contenido directamente en el documento</span>
                </span>
                <div className="pom-toolbar-actions">
                    <button className="pom-btn-cerrar" onClick={onCerrar}>
                        <i className="bi bi-x-lg" /> Cerrar
                    </button>
                    <button className="pom-btn-imprimir" onClick={handleImprimir} disabled={imprimiendo}>
                        {imprimiendo
                            ? <><i className="bi bi-arrow-repeat pom-spin" /> Preparando...</>
                            : <><i className="bi bi-printer-fill" /> Imprimir / PDF</>
                        }
                    </button>
                </div>
            </div>

            {/* ── Barra de formato ── */}
            <EditorToolbar editor={editor} />

            {/* ── Documento ── */}
            <div className="pom-documento" ref={docRef}>

                {/* Encabezado — logo fijo, deps editable */}
                <div className="pom-header">
                    <img src={logoMorelos} alt="Morelos" className="pom-logo" />
                    <div
                        className="pom-header-deps pom-editable-deps no-print-outline"
                        contentEditable
                        suppressContentEditableWarning
                    >
                        <p>Secretaría de Seguridad y Protección Ciudadana</p>
                        <p>Dirección General de Reinserción Social</p>
                        <p className="pom-num-oficio">Oficio Núm.: {numOficio}</p>
                    </div>
                </div>

                {/* Contenido editable con TipTap */}
                <EditorContent editor={editor} className="pom-editor-wrap" />

                {/* Firma — FIJA */}
                <div className="pom-firma">
                    <div className="pom-firma-linea" />
                    <p className="pom-firma-nombre">LIC. REY GIOVANNI RIVAS SANDOVAL</p>
                    <p className="pom-firma-cargo">DIRECTOR DE LA UNIDAD DE MEDIDAS CAUTELARES</p>
                    <p className="pom-firma-cargo">Y SALIDAS ALTERNAS PARA ADULTOS</p>
                </div>

                {/* Footer — FIJO */}
                <div className="pom-footer">
                    <img src={footerDorado} alt="" className="pom-footer-img" />
                    <p className="pom-footer-fecha">Documento generado el {new Date().toLocaleString('es-MX')}</p>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default PrintOficioMigracion;
