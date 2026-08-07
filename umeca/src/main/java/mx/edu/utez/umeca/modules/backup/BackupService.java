package mx.edu.utez.umeca.modules.backup;

import mx.edu.utez.umeca.modules.consulta.ConsultaRegistro;
import mx.edu.utez.umeca.modules.consulta.ConsultaRegistroRepository;
import mx.edu.utez.umeca.modules.correspondencia.Correspondencia;
import mx.edu.utez.umeca.modules.correspondencia.CorrespondenciaRepository;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadre;
import mx.edu.utez.umeca.modules.entrevista.EntrevistaEncuadreRepository;
import mx.edu.utez.umeca.modules.evaluacion.EvaluacionRiesgo;
import mx.edu.utez.umeca.modules.evaluacion.EvaluacionRiesgoRepository;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.imputado.ImputadoRepository;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelar;
import mx.edu.utez.umeca.modules.medidacautelar.MedidaCautelarRepository;
import mx.edu.utez.umeca.modules.suspension.SuspensionCondicional;
import mx.edu.utez.umeca.modules.suspension.SuspensionCondicionalRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class BackupService {

    @Autowired private ImputadoRepository imputadoRepo;
    @Autowired private EntrevistaEncuadreRepository entrevistaRepo;
    @Autowired private EvaluacionRiesgoRepository evaluacionRepo;
    @Autowired private MedidaCautelarRepository medidaRepo;
    @Autowired private SuspensionCondicionalRepository suspensionRepo;
    @Autowired private CorrespondenciaRepository correspondenciaRepo;
    @Autowired private ConsultaRegistroRepository consultaRepo;

    public byte[] generarZip() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            agregarEntrada(zos, "Imputados.xlsx",                     generarImputados());
            agregarEntrada(zos, "Entrevistas_Encuadre.xlsx",          generarEntrevistas());
            agregarEntrada(zos, "Evaluaciones_Riesgo.xlsx",           generarEvaluaciones());
            agregarEntrada(zos, "Medidas_Cautelares.xlsx",            generarMedidas());
            agregarEntrada(zos, "SCP_MedidasSuspensiones.xlsx",       generarSCPdesdeMedidas());
            agregarEntrada(zos, "Suspension_Condicional_Modulo.xlsx", generarSuspensionCondicionalModulo());
            agregarEntrada(zos, "Correspondencia.xlsx",               generarCorrespondencia());
            agregarEntrada(zos, "Consultas_Registros.xlsx",           generarConsultas());
        }
        return baos.toByteArray();
    }

    private void agregarEntrada(ZipOutputStream zos, String nombre, byte[] datos) throws IOException {
        zos.putNextEntry(new ZipEntry(nombre));
        zos.write(datos);
        zos.closeEntry();
    }

    // ── Estilos ───────────────────────────────────────────────────────────────

    private CellStyle estHead(XSSFWorkbook wb) {
        CellStyle s = wb.createCellStyle();
        Font f = wb.createFont(); f.setBold(true); f.setColor(IndexedColors.WHITE.getIndex());
        s.setFont(f);
        s.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setBorderBottom(BorderStyle.THIN); s.setBorderLeft(BorderStyle.THIN); s.setBorderRight(BorderStyle.THIN);
        return s;
    }
    private CellStyle estData(XSSFWorkbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setBorderBottom(BorderStyle.THIN); s.setBorderLeft(BorderStyle.THIN); s.setBorderRight(BorderStyle.THIN);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        return s;
    }
    private CellStyle estAlt(XSSFWorkbook wb, CellStyle base) {
        CellStyle s = wb.createCellStyle(); s.cloneStyleFrom(base);
        s.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return s;
    }
    private void heads(Sheet sh, CellStyle he, String[] cols) {
        Row r = sh.createRow(0);
        for (int i = 0; i < cols.length; i++) {
            Cell c = r.createCell(i); c.setCellValue(cols[i]); c.setCellStyle(he);
            sh.setColumnWidth(i, 5500);
        }
    }
    private void v(Row row, int col, String val, CellStyle st) {
        Cell c = row.createCell(col); c.setCellValue(val != null ? val : ""); c.setCellStyle(st);
    }
    private String s(Object o) { return o != null ? o.toString() : ""; }
    private String d(Object o) { return o != null ? o.toString() : ""; }
    private byte[] bytes(XSSFWorkbook wb) throws IOException {
        ByteArrayOutputStream o = new ByteArrayOutputStream(); wb.write(o); return o.toByteArray();
    }
    private CellStyle st(int idx, CellStyle da, CellStyle al) { return idx % 2 == 0 ? al : da; }

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Parsea un JSON array de strings y devuelve array de 7 elementos (vacíos si faltan). */
    private String[] parseStringArray7(String json) {
        String[] result = new String[7];
        for (int i = 0; i < 7; i++) result[i] = "";
        if (json == null || json.isBlank()) return result;
        try {
            JsonNode node = MAPPER.readTree(json);
            if (node.isArray()) {
                for (int i = 0; i < Math.min(7, node.size()); i++)
                    result[i] = node.get(i).asText("");
            }
        } catch (Exception ignored) {}
        return result;
    }

    /** Parsea domiciliosAnterioresJson → texto legible por domicilio. */
    private String parseDomiciliosAnteriores(String json) {
        if (json == null || json.isBlank()) return "";
        try {
            JsonNode arr = MAPPER.readTree(json);
            if (!arr.isArray()) return json;
            List<String> partes = new ArrayList<>();
            int n = 1;
            for (JsonNode d : arr) {
                String dir = d.path("direccion").asText("").trim();
                if (dir.isEmpty()) continue;
                String propia = d.path("casaPropia").asBoolean(false) ? "Casa propia" : "No propia";
                String tiempo = d.path("tiempoResidencia").asText("").trim();
                String motivo = d.path("motivoMudanza").asText("").trim();
                StringBuilder sb = new StringBuilder("[" + n++ + "] " + dir + " | " + propia);
                if (!tiempo.isEmpty()) sb.append(" | ").append(tiempo);
                if (!motivo.isEmpty()) sb.append(" | Motivo: ").append(motivo);
                partes.add(sb.toString());
            }
            return String.join(" / ", partes);
        } catch (Exception ignored) { return json; }
    }

    /** Parsea empleosAnterioresJson → texto legible por empleo. */
    private String parseEmpleosAnteriores(String json) {
        if (json == null || json.isBlank()) return "";
        try {
            JsonNode arr = MAPPER.readTree(json);
            if (!arr.isArray()) return json;
            List<String> partes = new ArrayList<>();
            int n = 1;
            for (JsonNode e : arr) {
                String empresa = e.path("empresa").asText("").trim();
                if (empresa.isEmpty()) continue;
                String puesto  = e.path("puesto").asText("").trim();
                String jefe    = e.path("nombreJefe").asText("").trim();
                String razon   = e.path("razon").asText("").trim();
                String inicio  = e.path("inicio").asText("").trim();
                String fin     = e.path("conclusion").asText("").trim();
                StringBuilder sb = new StringBuilder("[" + n++ + "] " + empresa);
                if (!puesto.isEmpty())  sb.append(" | ").append(puesto);
                if (!jefe.isEmpty())    sb.append(" | Jefe: ").append(jefe);
                if (!inicio.isEmpty())  sb.append(" | ").append(inicio);
                if (!fin.isEmpty())     sb.append(" – ").append(fin);
                if (!razon.isEmpty())   sb.append(" | Razón: ").append(razon);
                partes.add(sb.toString());
            }
            return String.join(" / ", partes);
        } catch (Exception ignored) { return json; }
    }

    // ── 1. Imputados ──────────────────────────────────────────────────────────

    private byte[] generarImputados() throws IOException {
        List<Imputado> lista = imputadoRepo.findAllByOrderByCreatedAtDesc();
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet("Imputados");
            CellStyle he = estHead(wb), da = estData(wb), al = estAlt(wb, da);
            heads(sh, he, new String[]{
                "Nombre(s)", "Ap. Paterno", "Ap. Materno", "Causa Penal", "Delito", "Ubicación Física",
                "Fallecido", "Fecha Fallecimiento", "Quien Avisó", "Parentesco Informante",
                "Cómo se Comprobó", "No. Acta Defunción", "Obs. Fallecimiento",
                "Carpeta Cerrada", "No. Cierre Carpeta", "Fecha Cierre Carpeta",
                "Responsable Cierre", "Motivo Cierre", "Estatus Cumplimiento Cierre",
                "Fecha Ingreso Cierre", "Notas Cierre", "Fecha Registro"
            });
            int idx = 1;
            for (Imputado i : lista) {
                Row row = sh.createRow(idx); CellStyle st = st(idx, da, al);
                v(row,0,i.getNombre(),st); v(row,1,i.getApPaterno(),st); v(row,2,i.getApMaterno(),st);
                v(row,3,i.getCausaPenal(),st); v(row,4,i.getDelito(),st); v(row,5,i.getUbicacionFisica(),st);
                v(row,6,i.isFallecido()?"Sí":"No",st); v(row,7,d(i.getFechaFallecimiento()),st);
                v(row,8,i.getQuienAviso(),st); v(row,9,i.getParentescoInformante(),st);
                v(row,10,i.getComoSeComprobo(),st); v(row,11,i.getNoActaDefuncion(),st);
                v(row,12,i.getObservacionesFallecimiento(),st);
                v(row,13,i.isCarpetaCerrada()?"Sí":"No",st); v(row,14,i.getNumeroCierreCarpeta(),st);
                v(row,15,d(i.getFechaCierreCarpeta()),st); v(row,16,i.getResponsableCierreCarpeta(),st);
                v(row,17,i.getMotivoCierreCarpeta(),st); v(row,18,i.getEstatusCumplimientoCierre(),st);
                v(row,19,d(i.getFechaIngresoCierre()),st); v(row,20,i.getNotasCierre(),st);
                v(row,21,i.getCreatedAt()!=null?i.getCreatedAt().toLocalDate().toString():"",st);
                idx++;
            }
            return bytes(wb);
        }
    }

    // ── 2. Entrevistas de Encuadre ────────────────────────────────────────────

    private byte[] generarEntrevistas() throws IOException {
        List<EntrevistaEncuadre> lista = entrevistaRepo.findAll();
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet("Entrevistas");
            CellStyle he = estHead(wb), da = estData(wb), al = estAlt(wb, da);
            heads(sh, he, new String[]{
                // Identificación
                "Folio","Causa Penal","Fecha Registro","Libro","Foja","Estado",
                // Datos personales
                "Nombre(s)","Ap. Paterno","Ap. Materno","Fecha Nacimiento","Edad","Género",
                "Municipio","Estado Nacimiento","País","CURP","Tel. Casa","Celular","Email",
                "Complexión","Estatura","Color Ojos","Cejas","Tez/Piel","Color Cabello","Tamaño Labios",
                "Señas Cara","Tiene Tatuajes","Tatuajes (detalle)","Alias","Documentos Migratorios",
                "Estado Civil","Grupo Vulnerable","Grado Estudios","Enfermedad",
                // Víctima
                "Conoce Víctima","Tel. Víctima","Nombre Víctima","Domicilio Víctima","Relación Víctima",
                // Trabajo
                "Empresa","Tel. Empresa","Salario Mensual","Puesto","Nombre Jefe","Horario Trabajo",
                "Domicilio Trabajo","Último Empleo",
                // Adicciones
                "Tratamiento Adicciones","Detalle Tratamiento","Familiares con Consumo","Detalle Fam. Consumo",
                // Factores
                "Buena Base","Detalle Buena Base","Obligaciones Difíciles","Detalle Obligaciones",
                "Familiares en Exterior","Detalle Familiares Exterior",
                // Tipo seguimiento
                "Tipo Seguimiento","Registrado Por","Fecha Completado"
            });
            int idx = 1;
            for (EntrevistaEncuadre e : lista) {
                Row row = sh.createRow(idx); CellStyle st = st(idx, da, al);
                v(row,0,e.getFolio(),st); v(row,1,e.getCausaPenal(),st); v(row,2,d(e.getFechaRegistro()),st);
                v(row,3,e.getLibro(),st); v(row,4,e.getFoja(),st); v(row,5,s(e.getEstado()),st);
                v(row,6,e.getNombre(),st); v(row,7,e.getApPaterno(),st); v(row,8,e.getApMaterno(),st);
                v(row,9,d(e.getFechaNacimiento()),st); v(row,10,s(e.getEdad()),st); v(row,11,e.getGenero(),st);
                v(row,12,e.getMunicipio(),st); v(row,13,e.getEstadoNacimiento(),st); v(row,14,e.getPais(),st);
                v(row,15,e.getCurp(),st); v(row,16,e.getTelefonoCasa(),st); v(row,17,e.getCelular(),st);
                v(row,18,e.getEmail(),st); v(row,19,e.getComplexion(),st); v(row,20,s(e.getEstatura()),st);
                v(row,21,e.getColorOjos(),st); v(row,22,e.getCejas(),st); v(row,23,e.getTezPiel(),st);
                v(row,24,e.getColorCabello(),st); v(row,25,e.getTamLabios(),st); v(row,26,e.getSenasCara(),st);
                v(row,27,Boolean.TRUE.equals(e.getTieneTatuajes())?"Sí":"No",st);
                v(row,28,e.getTatuajesJson(),st); v(row,29,e.getAlias(),st);
                v(row,30,e.getDocumentosMigratorios(),st); v(row,31,e.getEstadoCivil(),st);
                v(row,32,e.getGrupoVulnerable(),st); v(row,33,e.getGradoEstudios(),st);
                v(row,34,e.getEnfermedad(),st);
                v(row,35,Boolean.TRUE.equals(e.getConoceVictima())?"Sí":"No",st);
                v(row,36,e.getTelVictima(),st); v(row,37,e.getNombreVictima(),st);
                v(row,38,e.getDomicilioVictima(),st); v(row,39,e.getRelacionVictima(),st);
                v(row,40,e.getEmpresa(),st); v(row,41,e.getTelEmpresa(),st);
                v(row,42,s(e.getSalarioMensual()),st); v(row,43,e.getPuesto(),st);
                v(row,44,e.getNombreJefe(),st); v(row,45,e.getHorarioTrabajo(),st);
                v(row,46,e.getDomicilioTrabajo(),st); v(row,47,e.getUltimoEmpleo(),st);
                v(row,48,Boolean.TRUE.equals(e.getTratamientoAdicciones())?"Sí":"No",st);
                v(row,49,e.getTratamientoAdiccionesEsp(),st);
                v(row,50,Boolean.TRUE.equals(e.getFamiliaresConsumo())?"Sí":"No",st);
                v(row,51,e.getFamiliaresConsumoEsp(),st);
                v(row,52,Boolean.TRUE.equals(e.getBuenaBase())?"Sí":"No",st);
                v(row,53,e.getBuenaBaseEsp(),st);
                v(row,54,Boolean.TRUE.equals(e.getObligacionesDificiles())?"Sí":"No",st);
                v(row,55,e.getObligacionesDificilesEsp(),st);
                v(row,56,Boolean.TRUE.equals(e.getFamiliaresExterior())?"Sí":"No",st);
                v(row,57,e.getFamiliaresExteriorEsp(),st);
                v(row,58,s(e.getTipoSeguimiento()),st);
                v(row,59,e.getRegistradoPor()!=null?e.getRegistradoPor().getNombre()+" "+s(e.getRegistradoPor().getApPaterno()):"",st);
                v(row,60,e.getFechaCompletado()!=null?e.getFechaCompletado().toLocalDate().toString():"",st);
                idx++;
            }
            return bytes(wb);
        }
    }

    // ── 3. Evaluaciones de Riesgo ─────────────────────────────────────────────

    private byte[] generarEvaluaciones() throws IOException {
        List<EvaluacionRiesgo> lista = evaluacionRepo.findAll();
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet("Evaluaciones");
            CellStyle he = estHead(wb), da = estData(wb), al = estAlt(wb, da);
            heads(sh, he, new String[]{
                // Encabezado
                "Fecha Solicitud","No. Oficio","Folio Escrito","Fiscalía","Tipo Solicitud","Tipo Documento",
                "Solicitante","Cargo Solicitante","Dependencia Solicitante","Evaluador",
                // Imputado
                "Imputado","Causa Penal","Delito","Artículo Delito",
                "Puesta a Disposición","Fecha Audiencia","Hora Inicio","Hora Final","Lugar Entrevista",
                "Género","Fecha Nacimiento","Edad","Lugar Nacimiento","Municipio","Estado Nac.","País","CURP",
                "Estado Civil","Grado Estudios",
                // Domicilio
                "Dom. Calle","Dom. No.","Dom. Colonia","Dom. Municipio","Dom. Estado",
                "Tiempo en Domicilio","Tipo Domicilio","Nombre Arrendador","Monto Domicilio",
                "Tel. Domicilio","Cel. Domicilio","Calle Secundaria","No. Secundario","Colonia Secundaria",
                "Municipio Secundario","Razón Domicilio","Domicilios Anteriores",
                // Trabajo/Escuela
                "Empresa","Tel. Empresa","Puesto","Nombre Jefe","Horario","Dom. Trabajo","Salario","Último Empleo",
                "Empleos Anteriores","Escuela","Año Escolar","Atraso Escolar",
                // Social
                "Hijos","Núm. Hijos","Hijos Menores","Personas Dependientes","Dónde Habitan Dependientes",
                "Tiempo en Morelos","Familiares Otro País","Medios Comunicación","Dónde Habitan Familiares",
                "Tiene Visa","Tiene Pasaporte","Enfermedades","Hobbies","Enfermedad Familiar","Organizaciones",
                // Denunciante
                "Sabe Denunciante","Nombre Denunciante","Vive con Imputado","Saben Dónde Vive",
                "Bases Víctima","Relación Víctima",
                // Antecedentes
                "Reincidencia","Descripción Compromiso","Procesos Anteriores",
                // Verificaciones
                "S1 Método","S1 Resultado","S2 Método","S2 Resultado","S3 Método","S3 Resultado",
                "S4 Método","S4 Resultado","S5 Método","S5 Resultado","S6 Método","S6 Resultado",
                "S7 Método","S7 Resultado","S8 Método","S8 Resultado","S9 Método","S9 Resultado",
                "S10 Método","S10 Resultado","S11 Método","S11 Resultado",
                // Conclusión
                "Obs. Generales","Justificación Resultado","Conclusión General",
                "Riesgo Procesal 1","Riesgo Procesal 2","Riesgo Procesal 3","Riesgo Procesal 4",
                "Riesgo Procesal 5","Riesgo Procesal 6","Riesgo Procesal 7",
                "Factor Estabilidad 1","Factor Estabilidad 2","Factor Estabilidad 3","Factor Estabilidad 4",
                "Factor Estabilidad 5","Factor Estabilidad 6","Factor Estabilidad 7",
                "Resultado","Estatus","Fecha Registro"
            });
            int idx = 1;
            for (EvaluacionRiesgo e : lista) {
                Row row = sh.createRow(idx); CellStyle st = st(idx, da, al);
                String imp = e.getImputado()!=null ? e.getImputado().getNombre()+" "+s(e.getImputado().getApPaterno()) : "";
                String eval = e.getEvaluador()!=null ? e.getEvaluador().getNombre()+" "+s(e.getEvaluador().getApPaterno()) : "";
                v(row,0,d(e.getFechaSolicitud()),st); v(row,1,e.getNumOficio(),st);
                v(row,2,e.getFolioEscrito(),st); v(row,3,e.getFiscalia(),st);
                v(row,4,e.getTipoSolicitud(),st); v(row,5,s(e.getTipoDocumento()),st);
                v(row,6,e.getNombreSolicitanteTexto(),st); v(row,7,e.getCargoSolicitante(),st);
                v(row,8,e.getDependenciaSolicitante(),st); v(row,9,eval,st);
                v(row,10,imp,st);
                v(row,11,e.getImputado()!=null?e.getImputado().getCausaPenal():"",st);
                v(row,12,e.getImputado()!=null?s(e.getImputado().getDelito()):"",st);
                v(row,13,e.getArticuloDelito(),st);
                v(row,14,d(e.getPuestaDisposicion()),st); v(row,15,d(e.getFechaAudiencia()),st);
                v(row,16,e.getHoraInicio(),st); v(row,17,e.getHoraFinal(),st);
                v(row,18,e.getLugarEntrevista(),st); v(row,19,e.getGenero(),st);
                v(row,20,d(e.getFechaNacimiento()),st); v(row,21,s(e.getEdad()),st);
                v(row,22,e.getLugarNacimientoImp(),st); v(row,23,e.getMunicipioImp(),st);
                v(row,24,e.getEstadoNacimiento(),st); v(row,25,e.getPaisImp(),st);
                v(row,26,e.getCurp(),st); v(row,27,e.getEstadoCivil(),st); v(row,28,e.getGradoEstudios(),st);
                v(row,29,e.getDomicilioActualCalle(),st); v(row,30,e.getDomicilioActualNo(),st);
                v(row,31,e.getDomicilioActualColonia(),st); v(row,32,e.getDomicilioActualMunicipio(),st);
                v(row,33,e.getDomicilioActualEstado(),st); v(row,34,e.getTiempoEnDomicilio(),st);
                v(row,35,e.getTipoDomicilioActual(),st); v(row,36,e.getNombreArrendador(),st);
                v(row,37,s(e.getMontoDomicilio()),st); v(row,38,e.getTelefonoDomicilio(),st);
                v(row,39,e.getCelularDomicilio(),st); v(row,40,e.getCalleSecundaria(),st);
                v(row,41,e.getNoSecundaria(),st); v(row,42,e.getColoniaSecundaria(),st);
                v(row,43,e.getMunicipioSecundario(),st); v(row,44,e.getRazonDomicilio(),st);
                v(row,45,parseDomiciliosAnteriores(e.getDomiciliosAnterioresJson()),st);
                v(row,46,e.getEmpresaImp(),st); v(row,47,e.getTelEmpresaImp(),st);
                v(row,48,e.getPuestoImp(),st); v(row,49,e.getNombreJefeImp(),st);
                v(row,50,e.getHorarioTrabajoImp(),st); v(row,51,e.getDomicilioTrabajoImp(),st);
                v(row,52,s(e.getSalarioMensualImp()),st); v(row,53,e.getUltimoEmpleoImp(),st);
                v(row,54,parseEmpleosAnteriores(e.getEmpleosAnterioresJson()),st); v(row,55,e.getNombreEscuela(),st);
                v(row,56,e.getAnioEscolar(),st); v(row,57,e.getAtrasoEscolar(),st);
                v(row,58,Boolean.TRUE.equals(e.getHijos())?"Sí":"No",st);
                v(row,59,s(e.getNumHijos()),st); v(row,60,s(e.getNumHijosMenores()),st);
                v(row,61,e.getPersonasDependientes(),st); v(row,62,e.getDondeHabitanDependientes(),st);
                v(row,63,e.getTiempoEnMorelos(),st); v(row,64,e.getFamiliaresOtroPais(),st);
                v(row,65,e.getMediosComunicacion(),st); v(row,66,e.getDondeHabitanFamiliares(),st);
                v(row,67,Boolean.TRUE.equals(e.getTieneVisa())?"Sí":"No",st);
                v(row,68,Boolean.TRUE.equals(e.getTienePasaporte())?"Sí":"No",st);
                v(row,69,e.getEnfermedades(),st); v(row,70,e.getHobbies(),st);
                v(row,71,e.getEnfermedadFamiliar(),st); v(row,72,e.getOrganizaciones(),st);
                v(row,73,Boolean.TRUE.equals(e.getSabeDenunciante())?"Sí":"No",st);
                v(row,74,e.getNombreDenunciante(),st);
                v(row,75,Boolean.TRUE.equals(e.getViveConImputado())?"Sí":"No",st);
                v(row,76,Boolean.TRUE.equals(e.getSabenDondeVive())?"Sí":"No",st);
                v(row,77,e.getBasesVictima(),st); v(row,78,e.getRelacionVictima(),st);
                v(row,79,Boolean.TRUE.equals(e.getReincidencia())?"Sí":"No",st);
                v(row,80,e.getDescripcionCompromiso(),st); v(row,81,e.getProcesosAnteriores(),st);
                v(row,82,e.getVerifS1Metodo(),st); v(row,83,e.getVerifS1Resultado(),st);
                v(row,84,e.getVerifS2Metodo(),st); v(row,85,e.getVerifS2Resultado(),st);
                v(row,86,e.getVerifS3Metodo(),st); v(row,87,e.getVerifS3Resultado(),st);
                v(row,88,e.getVerifS4Metodo(),st); v(row,89,e.getVerifS4Resultado(),st);
                v(row,90,e.getVerifS5Metodo(),st); v(row,91,e.getVerifS5Resultado(),st);
                v(row,92,e.getVerifS6Metodo(),st); v(row,93,e.getVerifS6Resultado(),st);
                v(row,94,e.getVerifS7Metodo(),st); v(row,95,e.getVerifS7Resultado(),st);
                v(row,96,e.getVerifS8Metodo(),st); v(row,97,e.getVerifS8Resultado(),st);
                v(row,98,e.getVerifS9Metodo(),st); v(row,99,e.getVerifS9Resultado(),st);
                v(row,100,e.getVerifS10Metodo(),st); v(row,101,e.getVerifS10Resultado(),st);
                v(row,102,e.getVerifS11Metodo(),st); v(row,103,e.getVerifS11Resultado(),st);
                v(row,104,e.getObservacionesGenerales(),st);
                v(row,105,e.getJustificacionResultado(),st); v(row,106,e.getConclusionGeneral(),st);
                String[] riesgos = parseStringArray7(e.getRiesgosProcesalesJson()); String[] factores = parseStringArray7(e.getFactoresEstabilidadJson()); for (int _i=0;_i<7;_i++) v(row,107+_i,riesgos[_i],st); for (int _i=0;_i<7;_i++) v(row,114+_i,factores[_i],st);
                v(row,121,s(e.getResultado()),st); v(row,122,s(e.getEstatus()),st);
                v(row,123,e.getCreatedAt()!=null?e.getCreatedAt().toLocalDate().toString():"",st);
                idx++;
            }
            return bytes(wb);
        }
    }

    // ── 4 & 5. Medidas Cautelares y SCP (misma tabla, filtrado por tipo) ──────

    private byte[] generarMedidasPorTipo(MedidaCautelar.TipoMedida tipo, String sheetName) throws IOException {
        List<MedidaCautelar> lista = medidaRepo.findAllByOrderByCreatedAtDesc()
                .stream().filter(m -> m.getTipo() == tipo).toList();
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet(sheetName);
            CellStyle he = estHead(wb), da = estData(wb), al = estAlt(wb, da);
            heads(sh, he, new String[]{
                "Imputado","Causa Penal","Delito","Modalidad","Sede","Nombre Juez","Distrito Judicial",
                "Fecha Recepción","Fecha Formulación","Fecha Vinculación Proceso",
                "Fecha Entrevista Evaluación","Fecha Canalización",
                "A Disposición","Descripción Domicilio",
                "Presentación Periódica","No. Biométrico","No. Libro","No. Página",
                "Cumpliendo/Incumpliendo","Descripción Informe",
                "Fracciones","Detalles Fracciones","Advertencia","Observaciones",
                "Responsable Seguimiento","Obs. Generales","Fecha Próxima Revisión",
                "Vigencia Inicio","Vigencia Fin","Estado",
                "Acuerdo Reparatorio","Descripción Acuerdo","Fecha Celebración Acuerdo",
                "Fecha Cumplimiento Acuerdo","Estatus Final","Fecha Término",
                "Fecha Imposición SCP","Plazo SCP (meses)","Canalizacion","Tipo Servicio",
                "Fecha Informe Final","Vencimiento Plazo","Oficio Sobreseimiento","Responsable Cierre",
                "Fecha Revocación","Oficio Revocación","Motivo Revocación",
                "Fecha Ampliación","Nuevo Plazo SCP","Motivo Ampliación",
                "Cambiado a SCP","Fecha Cambio SCP","Viene de MC",
                "Cambiado a MC","Fecha Cambio MC","Viene de SCP",
                "Fecha Levantamiento","Oficio Levantamiento","Firma Levantamiento",
                "Motivo Levantamiento","Cumplió Levantamiento",
                "Registrado Por","Fecha Registro"
            });
            int idx = 1;
            for (MedidaCautelar m : lista) {
                Row row = sh.createRow(idx); CellStyle st = st(idx, da, al);
                String imp = m.getImputado()!=null ? m.getImputado().getNombre()+" "+s(m.getImputado().getApPaterno()) : "";
                String reg = m.getRegistradoPor()!=null ? m.getRegistradoPor().getNombre()+" "+s(m.getRegistradoPor().getApPaterno()) : "";
                v(row,0,imp,st); v(row,1,m.getCausaPenal(),st); v(row,2,m.getDelito(),st);
                v(row,3,m.getModalidad(),st); v(row,4,m.getSede(),st); v(row,5,m.getNombreJuez(),st);
                v(row,6,m.getDistritoJudicial(),st);
                v(row,7,d(m.getFechaRecepcion()),st); v(row,8,d(m.getFechaFormulacion()),st);
                v(row,9,d(m.getFechaVinculacionProceso()),st); v(row,10,d(m.getFechaEntrevistaEvaluacion()),st);
                v(row,11,d(m.getFechaCanalizacion()),st);
                v(row,12,Boolean.TRUE.equals(m.getADisposicion())?"Sí":"No",st);
                v(row,13,m.getDescripcionDomicilio(),st);
                v(row,14,m.getPresentacionPeriodica(),st); v(row,15,m.getNoBiometrico(),st);
                v(row,16,m.getNoLibro(),st); v(row,17,m.getNoPagina(),st);
                v(row,18,m.getCumpliendoIncumpliendo(),st); v(row,19,m.getDescripcionInforme(),st);
                v(row,20,m.getFracciones()!=null?String.join(", ",m.getFracciones()):"",st);
                v(row,21,m.getDetallesFracciones(),st); v(row,22,m.getAdvertencia(),st);
                v(row,23,m.getObservaciones(),st); v(row,24,m.getResponsableSeguimiento(),st);
                v(row,25,m.getObservacionesGenerales(),st); v(row,26,d(m.getFechaProximaRevision()),st);
                v(row,27,d(m.getVigenciaInicio()),st); v(row,28,d(m.getVigenciaFin()),st);
                v(row,29,s(m.getEstado()),st);
                v(row,30,Boolean.TRUE.equals(m.getAcuerdoReparatorio())?"Sí":"No",st);
                v(row,31,m.getDescripcionAcuerdo(),st); v(row,32,d(m.getFechaCelebracionAcuerdo()),st);
                v(row,33,d(m.getFechaCumplimientoAcuerdo()),st); v(row,34,m.getEstatusFinal(),st);
                v(row,35,d(m.getFechaTermino()),st); v(row,36,d(m.getFechaImposicionScp()),st);
                v(row,37,s(m.getPlazoScp()),st); v(row,38,m.getCanalizacion(),st);
                v(row,39,m.getTipoServicio(),st); v(row,40,d(m.getFechaInformeFinal()),st);
                v(row,41,d(m.getVencimientoPlazo()),st); v(row,42,m.getOficioSobreseimiento(),st);
                v(row,43,m.getResponsableCierre(),st); v(row,44,d(m.getFechaRevocacion()),st);
                v(row,45,m.getOficioRevocacion(),st); v(row,46,m.getMotivoRevocacion(),st);
                v(row,47,d(m.getFechaAmpliacion()),st); v(row,48,s(m.getNuevoPlazoScp()),st);
                v(row,49,m.getMotivoAmpliacion(),st);
                v(row,50,Boolean.TRUE.equals(m.getCambiadoAScp())?"Sí":"No",st);
                v(row,51,d(m.getFechaCambioScp()),st);
                v(row,52,Boolean.TRUE.equals(m.getVieneDeMC())?"Sí":"No",st);
                v(row,53,Boolean.TRUE.equals(m.getCambiadoAMc())?"Sí":"No",st);
                v(row,54,d(m.getFechaCambioMc()),st);
                v(row,55,Boolean.TRUE.equals(m.getVieneDeScp())?"Sí":"No",st);
                v(row,56,d(m.getFechaLevantamiento()),st); v(row,57,m.getOficioLevantamiento(),st);
                v(row,58,m.getFirmaLevantamiento(),st); v(row,59,m.getMotivoLevantamiento(),st);
                v(row,60,m.getCumplioLevantamiento()!=null?m.getCumplioLevantamiento()?"Sí":"No":"",st);
                v(row,61,reg,st);
                v(row,62,m.getCreatedAt()!=null?m.getCreatedAt().toLocalDate().toString():"",st);
                idx++;
            }
            return bytes(wb);
        }
    }

    private byte[] generarMedidas() throws IOException {
        return generarMedidasPorTipo(MedidaCautelar.TipoMedida.MEDIDA_CAUTELAR, "Medidas Cautelares");
    }
    private byte[] generarSCPdesdeMedidas() throws IOException {
        return generarMedidasPorTipo(MedidaCautelar.TipoMedida.SUSPENSION_CONDICIONAL, "SCP MedidasSuspensiones");
    }

    // ── 6. Suspensión Condicional (módulo independiente) ──────────────────────

    private byte[] generarSuspensionCondicionalModulo() throws IOException {
        List<SuspensionCondicional> lista = suspensionRepo.findAll(Pageable.unpaged()).getContent();
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet("Suspension Condicional");
            CellStyle he = estHead(wb), da = estData(wb), al = estAlt(wb, da);
            heads(sh, he, new String[]{
                "Imputado","Causa","Oficio","Fuero","Delito","Plazo",
                "Fecha Recibido","Asunto","Sobreseimiento","Observaciones","Año"
            });
            int idx = 1;
            for (SuspensionCondicional sc : lista) {
                Row row = sh.createRow(idx); CellStyle st = st(idx, da, al);
                v(row,0,sc.getImputado(),st); v(row,1,sc.getCausa(),st); v(row,2,sc.getOficio(),st);
                v(row,3,s(sc.getFuero()),st); v(row,4,sc.getDelito(),st); v(row,5,sc.getPlazo(),st);
                v(row,6,d(sc.getRecibido()),st); v(row,7,sc.getAsunto(),st);
                v(row,8,sc.getSobreseguimiento(),st); v(row,9,sc.getObservaciones(),st);
                v(row,10,s(sc.getAnio()),st);
                idx++;
            }
            return bytes(wb);
        }
    }

    // ── 7. Correspondencia ────────────────────────────────────────────────────

    private byte[] generarCorrespondencia() throws IOException {
        List<Correspondencia> lista = correspondenciaRepo.findAllByOrderByCreatedAtDesc();
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet("Correspondencia");
            CellStyle he = estHead(wb), da = estData(wb), al = estAlt(wb, da);
            heads(sh, he, new String[]{
                "No. Turno","Sede","No. Oficio","Fecha Oficio","Fecha Recibido",
                "Tipo","Remitente","Asunto","Prioridad","Estado",
                "Requiere Respuesta","Término Respuesta (hrs)",
                "Asignado A","Registrado Por","Fecha Registro"
            });
            int idx = 1;
            for (Correspondencia c : lista) {
                Row row = sh.createRow(idx); CellStyle st = st(idx, da, al);
                v(row,0,c.getNoTurno(),st); v(row,1,s(c.getSede()),st); v(row,2,c.getNoOficio(),st);
                v(row,3,d(c.getFechaOficio()),st); v(row,4,d(c.getFechaRecibido()),st);
                v(row,5,s(c.getTipo()),st); v(row,6,c.getRemitente(),st); v(row,7,c.getAsunto(),st);
                v(row,8,s(c.getPrioridad()),st); v(row,9,s(c.getEstado()),st);
                v(row,10,Boolean.TRUE.equals(c.getRequiereRespuesta())?"Sí":"No",st);
                v(row,11,s(c.getTerminoRespuestaHoras()),st);
                v(row,12,c.getAsignadoA()!=null?c.getAsignadoA().getNombre()+" "+s(c.getAsignadoA().getApPaterno()):"",st);
                v(row,13,c.getRegistradoPor()!=null?c.getRegistradoPor().getNombre()+" "+s(c.getRegistradoPor().getApPaterno()):"",st);
                v(row,14,c.getCreatedAt()!=null?c.getCreatedAt().toLocalDate().toString():"",st);
                idx++;
            }
            return bytes(wb);
        }
    }

    // ── 8. Consultas de Registros ─────────────────────────────────────────────

    private byte[] generarConsultas() throws IOException {
        List<ConsultaRegistro> lista = consultaRepo.findAll();
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sh = wb.createSheet("Consultas");
            CellStyle he = estHead(wb), da = estData(wb), al = estAlt(wb, da);
            heads(sh, he, new String[]{
                "Folio Consecutivo","Fecha Solicitud","Quien Solicita","Cargo","Dependencia",
                "Nombre Imputado","Ap. Paterno","Ap. Materno","Causa Penal",
                "Fecha Nac. Imputado","CURP","Imputados Adicionales (JSON)",
                "Resultado","No. Oficio","Observaciones","Fecha Registro"
            });
            int idx = 1;
            for (ConsultaRegistro c : lista) {
                Row row = sh.createRow(idx); CellStyle st = st(idx, da, al);
                v(row,0,s(c.getFolioConsecutivo()),st); v(row,1,d(c.getFechaSolicitud()),st);
                v(row,2,c.getQuienSolicita(),st); v(row,3,c.getCargoSolicitante(),st);
                v(row,4,c.getDependenciaSolicitante(),st); v(row,5,c.getNombreImputado(),st);
                v(row,6,c.getApPaternoImputado(),st); v(row,7,c.getApMaternoImputado(),st);
                v(row,8,c.getCausaPenal(),st); v(row,9,d(c.getFechaNacimientoImputado()),st);
                v(row,10,c.getCurp(),st); v(row,11,c.getImputadosJson(),st);
                v(row,12,s(c.getResultado()),st); v(row,13,c.getOficioNumero(),st);
                v(row,14,c.getObservaciones(),st);
                v(row,15,c.getCreatedAt()!=null?c.getCreatedAt().toLocalDate().toString():"",st);
                idx++;
            }
            return bytes(wb);
        }
    }
}
