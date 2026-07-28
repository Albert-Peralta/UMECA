package mx.edu.utez.umeca.modules.expediente;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Parsea el Excel de expedientes históricos (MC / SCP / HISTORICO).
 *
 * Estructura esperada (fila 2 = encabezados reales, datos desde fila 3):
 *   A  = NO.
 *   B  = ESTATUS
 *   C  = RESPONSABLE
 *   D  = A. PATERNO
 *   E  = A. MATERNO
 *   F  = NOMBRE(S)
 *   G  = NOMBRE calculado  (se ignora)
 *   H  = GENERO
 *   I  = FECHA DE NACIMIENTO
 *   J  = EDAD
 *   K  = Indígena
 *   L  = Etnia/Pueblo Indígena
 *   M  = Afrodescendiente
 *   N  = Extranjero/Migrante
 *   O  = Comunidad LGBT+
 *   P  = Discapacidad
 *   Q  = Ninguno  (se ignora en la entidad, si está marcado significa sin grupo)
 *   R  = Otro (especificar)
 *   S  = CALLE
 *   T  = NUMERO
 *   U  = COLONIA
 *   V  = MUNICIPIO
 *   W  = ESTADO
 *   X  = NUMERO TELEFONICO
 *   Y  = NUMERO TELEFONICO 02
 *   Z  = OCUPACION
 *   AA = TIPO DE VICTIMA (V1)
 *   AB = NOMBRE (V1)
 *   AC = GENERO (V1)
 *   AD = DOMICILIO (V1)
 *   AE = TELEFONO (V1)
 *   AF = TIPO DE VICTIMA (V1 extra, a veces se usa para V2 tipo)
 *   AG = NOMBRE (V2)
 *   AH = GENERO (V2)
 *   AI = DOMICILIO (V2)
 *   AJ = TELEFONO (V2)
 *   AK = FECHA DE RECEPCION
 *   AL = CAUSA PENAL
 *   AM = DELITO
 *   AN = MODALIDAD
 *   AO = SEDE
 *   AP = NOMBRE DEL JUEZ
 *   AQ = FECHA DE FORMULACION
 *   AR = FECHA DE VINCULACION A PROCESO
 *   AS = FECHA ENTREVISTA EVALUACION DE RIESGOS
 *   AT = FECHA AUDIENCIA IMPOSICION
 *   AU = FECHA ENTREVISTA EVALUACION DE RIESGOS 1022 (duplicado, se ignora)
 *   AV = ENTREVISTA ENCUADRE
 *   AW = Sustracción del proceso
 *   AX = Obstaculización
 *   AY = Riesgo para la víctima
 *   AZ = Opinión técnica sobre riesgos procesales
 *   BA = Informe
 *   BB = No aplica (general, se ignora)
 *   BC = El MP no la solicitó
 *   BD = Sin tiempo necesario
 *   BE = Persona no accedió
 *   BF = No fuentes de verificación
 *   BG = Otro (no aplica)
 *   BH = MC-I ... BU = MC-XIV  (14 columnas)
 *   BV = FECHA DE CANALIZACION
 *   BV = ¿A DISPOSICION?
 *   BW = COORDENADAS DE DOMICILIO
 *   BX = PRESENTACION PERIODICA
 *   BY = No. DE BIOMETRICO
 *   BZ = No. DE LIBRO
 *   CA = No. DE PAGINA
 *   CB = CUMPLIENDO O INCUMPLIENDO
 *   CC = DISTRITO JUDICIAL
 *   CD = ULTIMO INFORME MC
 *   CE = ACUERDO REPARATORIO
 *   CF = FECHA ACUERDO REPARATORIO
 *   CG = FECHA CUMPLIMIENTO ACUERDO
 *   CH = ESTATUS FINAL
 *   CI = FECHA TERMINO MC
 *   CJ = ESTADO FINAL
 *   CK = OBSERVACIONES
 *   CL... = SEGUIMIENTO 1, 2, 3 ... (hasta 15 columnas)
 */
@Component
public class ExpedienteExcelParser {

    private static final int FILA_DATOS_MC_SCP   = 2; // MC y SCP: título(fila1) + encabezados(fila2) → datos desde fila 3
    private static final int FILA_DATOS_HISTORICO = 1; // HISTORICO: encabezados(fila1) → datos desde fila 2
    private static final int COL_SEGUIMIENTO_INICIO_MC  = 102; // CY MC (seguimiento 1)
    private static final int COL_SEGUIMIENTO_INICIO_SCP = 99; // CV=99 (seguimiento 1 SCP)
    private static final int MAX_SEGUIMIENTOS = 20;

    /**
     * Parsea todas las hojas del Excel.
     * El tipo se detecta automáticamente por el nombre de la pestaña:
     *   "MC" → TipoExpediente.MC
     *   "SCP" → TipoExpediente.SCP
     *   "HISTORICO" / "HISTÓRICO" → TipoExpediente.HISTORICO
     * La zona se pasa como parámetro (XOCHITEPEC, CUAUTLA, JOJUTLA).
     */
    public List<ExpedienteAnteriorDTO> parsear(MultipartFile file, String zona) throws Exception {
        List<ExpedienteAnteriorDTO> lista = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {

            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                String nombreHoja = sheet.getSheetName().trim().toUpperCase()
                    .replace("Ó", "O").replace("Ó", "O");

                // Solo procesar hojas conocidas
                String tipo;
                if (nombreHoja.equals("MC"))                                      tipo = "MC";
                else if (nombreHoja.equals("SCP"))                                tipo = "SCP";
                else if (nombreHoja.startsWith("HIST"))                           tipo = "HISTORICO";
                else continue; // saltar hojas desconocidas

                lista.addAll(parsearHoja(sheet, tipo, zona));
            }
        }
        return lista;
    }

    private List<ExpedienteAnteriorDTO> parsearHoja(Sheet sheet, String tipo, String zona) {
        List<ExpedienteAnteriorDTO> lista = new ArrayList<>();
        int filaDatos = "HISTORICO".equals(tipo) ? FILA_DATOS_HISTORICO : FILA_DATOS_MC_SCP;
        for (int i = filaDatos; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            if ("HISTORICO".equals(tipo) && esFilaVaciaHistorico(row)) continue;
            else if (!"HISTORICO".equals(tipo) && esFilaVacia(row)) continue;

            ExpedienteAnteriorDTO dto = new ExpedienteAnteriorDTO();
            dto.setTipo(tipo);
            dto.setZona(zona);

            if ("SCP".equals(tipo)) {
                lista.add(parsearFilaScp(row, dto));
                continue;
            }
            if ("HISTORICO".equals(tipo)) {
                lista.add(parsearFilaHistorico(row, dto));
                continue;
            }

                // Datos del imputado
                dto.setNumero(str(row, 0));
                dto.setEstatus(str(row, 1));
                dto.setResponsable(str(row, 2));
                dto.setApPaterno(str(row, 3));
                dto.setApMaterno(str(row, 4));
                dto.setNombre(str(row, 5));
                // col 6 = nombre concatenado, se ignora
                dto.setGenero(str(row, 7));
                dto.setFechaNacimiento(fecha(row, 8));
                dto.setEdad(entero(row, 9));

                // Grupos vulnerables
                dto.setIndigena(bool(row, 10));
                dto.setEtniaPueblo(str(row, 11));
                dto.setAfrodescendiente(bool(row, 12));
                dto.setExtranjeroMigrante(bool(row, 13));
                dto.setComunidadLgbt(bool(row, 14));
                dto.setDiscapacidad(bool(row, 15));
                // col 16 = Ninguno, se ignora
                dto.setGrupoVulnerableOtro(str(row, 17));

                // Domicilio
                dto.setCalle(str(row, 18));
                dto.setNumeroExt(str(row, 19));
                dto.setColonia(str(row, 20));
                dto.setMunicipio(str(row, 21));
                dto.setEstadoDomicilio(str(row, 22));
                dto.setTelefono1(str(row, 23));
                dto.setTelefono2(str(row, 24));
                dto.setOcupacion(str(row, 25));

                // Víctima 1
                dto.setVictima1Tipo(str(row, 26));
                dto.setVictima1Nombre(str(row, 27));
                dto.setVictima1Genero(str(row, 28));
                dto.setVictima1Domicilio(str(row, 29));
                dto.setVictima1Telefono(str(row, 30));

                // Víctima 2 (AF=31 tipo, AG=32 nombre, AH=33 género, AI=34 dom, AJ=35 tel)
                dto.setVictima2Tipo(str(row, 31));
                dto.setVictima2Nombre(str(row, 32));
                dto.setVictima2Genero(str(row, 33));
                dto.setVictima2Domicilio(str(row, 34));
                dto.setVictima2Telefono(str(row, 35));

                // Oficio de imposición (AK=36 … AP=41)
                dto.setFechaRecepcion(fecha(row, 36));
                dto.setCausaPenal(str(row, 37));
                dto.setDelito(str(row, 38));
                dto.setModalidad(str(row, 39));
                dto.setSede(str(row, 40));
                dto.setNombreJuez(str(row, 41));
                dto.setFechaFormulacion(fecha(row, 42));          // AQ=42
                dto.setFechaVinculacionProceso(fecha(row, 43));   // AR=43
                dto.setFechaEntrevistaEvaluacion(fecha(row, 44)); // AS=44
                dto.setFechaAudienciaImposicion(fecha(row, 45));  // AT=45
                // AU=46 = segunda fecha evaluación (se ignora, ya está en AS)
                dto.setFechaEntrevistaEncuadre(fecha(row, 47));   // AV=47

                // Riesgos procesales (AW=48 … AZ=51)
                dto.setRiesgoSustraccion(bool(row, 48));          // AW=48
                dto.setRiesgoObstaculizacion(bool(row, 49));      // AX=49
                dto.setRiesgoVictima(bool(row, 50));              // AY=50
                dto.setOpinionTecnicaRiesgos(str(row, 51));       // AZ=51
                dto.setInforme(str(row, 52));                     // BA=52

                // No aplica (BB=53 general → ignora; BC–BG = motivos)
                // BB=53 = "No aplica (no entregó ninguno)" → se ignora
                dto.setNoAplicaMpNoSolicito(bool(row, 54));       // BC=54
                dto.setNoAplicaSinTiempo(bool(row, 55));          // BD=55
                dto.setNoAplicaPersonaNoAccedio(bool(row, 56));   // BE=56
                dto.setNoAplicaSinFuentes(bool(row, 57));         // BF=57
                dto.setNoAplicaOtro(str(row, 58));                // BG=58

                // Medidas cautelares Art.155 I–XIV (BH=59 … BU=72)
                dto.setMcI(bool(row, 59));
                dto.setMcIi(bool(row, 60));
                dto.setMcIii(bool(row, 61));
                dto.setMcIv(bool(row, 62));
                dto.setMcV(bool(row, 63));
                dto.setMcVi(bool(row, 64));
                dto.setMcVii(bool(row, 65));
                dto.setMcViii(bool(row, 66));
                dto.setMcIx(bool(row, 67));
                dto.setMcX(bool(row, 68));
                dto.setMcXi(bool(row, 69));
                dto.setMcXii(bool(row, 70));
                dto.setMcXiii(bool(row, 71));
                dto.setMcXiv(bool(row, 72));

                // Datos MC (BV=73 … CI=86)
                dto.setFechaCanalizacion(fecha(row, 73));         // BV=73
                dto.setADisposicion(str(row, 74));                // BW=74
                dto.setCoordenadasDomicilio(str(row, 75));        // BX=75
                dto.setPresentacionPeriodica(str(row, 76));       // BY=76
                dto.setNoBiometrico(str(row, 77));                // BZ=77
                dto.setNoLibro(str(row, 78));                     // CA=78
                dto.setNoPagina(str(row, 79));                    // CB=79
                dto.setCumpliendoIncumpliendo(str(row, 80));      // CC=80
                dto.setDistritoJudicial(str(row, 81));            // CD=81
                dto.setUltimoInformeMc(str(row, 82));             // CE=82
                dto.setAcuerdoReparatorio(str(row, 83));          // CF=83
                dto.setFechaAcuerdoReparatorio(fecha(row, 84));   // CG=84
                dto.setFechaCumplimientoAcuerdo(fecha(row, 85));  // CH=85
                dto.setEstatusFinal(str(row, 86));                // CI=86
                // CJ–CU (cols 87–98) = columnas ocultas, se omiten
                dto.setFechaTerminoMc(fecha(row, 99));            // CV=99
                dto.setEstadoFinal(str(row, 100));                // CW=100

                // Observaciones (CX=101)
                dto.setObservaciones(str(row, 101));

                // Seguimientos dinámicos
                List<String> segs = new ArrayList<>();
                for (int s = 0; s < MAX_SEGUIMIENTOS; s++) {
                    String seg = str(row, COL_SEGUIMIENTO_INICIO_MC + s);
                    if (seg != null && !seg.isBlank()) segs.add(seg);
                }
                if (!segs.isEmpty()) dto.setSeguimientos(segs);

                lista.add(dto);
            }
        return lista;
    }

    // ── Parser específico SCP ────────────────────────────────
    private ExpedienteAnteriorDTO parsearFilaScp(Row row, ExpedienteAnteriorDTO dto) {
        // Datos básicos (mismas columnas que MC)
        dto.setNumero(str(row, 0));
        dto.setEstatus(str(row, 1));
        dto.setResponsable(str(row, 2));
        dto.setApPaterno(str(row, 3));
        dto.setApMaterno(str(row, 4));
        dto.setNombre(str(row, 5));
        dto.setGenero(str(row, 7));
        dto.setFechaNacimiento(fecha(row, 8));
        dto.setEdad(entero(row, 9));

        // Grupos vulnerables
        dto.setIndigena(bool(row, 10));
        dto.setEtniaPueblo(str(row, 11));
        dto.setAfrodescendiente(bool(row, 12));
        dto.setExtranjeroMigrante(bool(row, 13));
        dto.setComunidadLgbt(bool(row, 14));
        dto.setDiscapacidad(bool(row, 15));
        dto.setGrupoVulnerableOtro(str(row, 17));

        // Domicilio
        dto.setCalle(str(row, 18));
        dto.setNumeroExt(str(row, 19));
        dto.setColonia(str(row, 20));
        dto.setMunicipio(str(row, 21));
        dto.setEstadoDomicilio(str(row, 22));
        dto.setTelefono1(str(row, 23));
        dto.setTelefono2(str(row, 24));
        dto.setOcupacion(str(row, 25));

        // Víctima 1
        dto.setVictima1Tipo(str(row, 26));
        dto.setVictima1Nombre(str(row, 27));
        dto.setVictima1Genero(str(row, 28));
        dto.setVictima1Domicilio(str(row, 29));
        dto.setVictima1Telefono(str(row, 30));

        // Víctima 2 (SCP tiene tipo para V2)
        dto.setVictima2Tipo(str(row, 31));
        dto.setVictima2Nombre(str(row, 32));
        dto.setVictima2Genero(str(row, 33));
        dto.setVictima2Domicilio(str(row, 34));
        dto.setVictima2Telefono(str(row, 35));

        // Datos procesales SCP
        dto.setFechaRecepcion(fecha(row, 36));
        dto.setFechaInicioSupervision(fecha(row, 37));  // 11. Fecha inicio supervisión
        dto.setCausaPenal(str(row, 38));
        dto.setDelito(str(row, 39));
        dto.setModalidad(str(row, 40));
        dto.setSede(str(row, 41));
        dto.setNombreJuez(str(row, 42));
        dto.setFechaFormulacion(fecha(row, 43));
        dto.setFechaVinculacionProceso(fecha(row, 44));
        dto.setFechaEntrevistaEvaluacion(fecha(row, 45));
        dto.setFechaEntrevistaEncuadre(fecha(row, 46));
        dto.setFechaImposicionScp(fecha(row, 47));      // FECHA DE IMPOSICION DE LA SCP
        dto.setPlazoScp(str(row, 48));                  // PLAZO DE LA SCP
        dto.setFechaConclusionScp(fecha(row, 49));      // Fecha de Conclusión SCP

        // Suspensión condicional I–XIV (cols 50–63)
        dto.setMcI(bool(row, 50));   dto.setMcIi(bool(row, 51));  dto.setMcIii(bool(row, 52));
        dto.setMcIv(bool(row, 53));  dto.setMcV(bool(row, 54));   dto.setMcVi(bool(row, 55));
        dto.setMcVii(bool(row, 56)); dto.setMcViii(bool(row, 57));dto.setMcIx(bool(row, 58));
        dto.setMcX(bool(row, 59));   dto.setMcXi(bool(row, 60));  dto.setMcXii(bool(row, 61));
        dto.setMcXiii(bool(row, 62));dto.setMcXiv(bool(row, 63));

        // Visitas y servicio
        dto.setPrimeraVisita(fecha(row, 64));           // BM=64
        dto.setSegundaVisita(fecha(row, 65));           // BN=65
        dto.setTerceraVisita(fecha(row, 66));           // BO=66
        // BP=67 = CANALIZACION (referencia dentro de sección SCP, se ignora)
        dto.setTipoServicio(str(row, 68));              // BQ=68
        dto.setFechaCanalizacion(fecha(row, 69));       // BR=69 = FECHA DE CANALIZACION
        dto.setPresentacionPeriodica(str(row, 70));     // BS=70
        dto.setCumpliendoIncumpliendo(str(row, 71));

        // Cumplimiento por medida I–XIV (cols 72–85) — se almacenan como observación
        dto.setNoLibro(str(row, 86));        // LIBRO SCP
        dto.setNoPagina(str(row, 87));       // PAGINA SCP
        dto.setNoBiometrico(str(row, 88));
        dto.setUltimoInformeMc(str(row, 89));
        dto.setFechaInformeFinal(fecha(row, 90));
        dto.setVencimientoPlazoScp(fecha(row, 91));
        dto.setOficioSobreseimiento(str(row, 92));
        dto.setResponsableCierreCarpeta(str(row, 93));
        dto.setEstatusFinal(str(row, 94));
        dto.setAjuste(str(row, 95));
        dto.setEstadoFinal(str(row, 96));
        dto.setNumeroExpedienteArchivo(str(row, 97));
        dto.setObservaciones(str(row, 98));

        // Seguimientos (hasta 20)
        List<String> segs = new ArrayList<>();
        for (int s = 0; s < MAX_SEGUIMIENTOS; s++) {
            String seg = str(row, COL_SEGUIMIENTO_INICIO_SCP + s);
            if (seg != null && !seg.isBlank()) segs.add(seg);
        }
        if (!segs.isEmpty()) dto.setSeguimientos(segs);

        return dto;
    }

    // ── Parser específico HISTORICO ──────────────────────────
    // Columnas (0-based):
    // A=0:NO, B=1:ESTATUS, C=2:RESPONSABLE, D=3:NOMBRE DEL IMPUTADO, E=4:CAUSA PENAL
    // F=5:GENERO, G=6:FECHA ASIGNACION, H=7:SEDE JUDICIAL, I=8:FECHA NAC, J=9:EDAD
    // K=10:DOMICILIO, L=11:TELEFONO, M=12:OCUPACION
    // N=13:NOMBRE VICTIMA, O=14:GENERO VICTIMA, P=15:DOMICILIO VICTIMA, Q=16:TEL VICTIMA
    // R=17:DELITO, S=18:MODALIDAD, T=19:FECHA FORMULACION, U=20:FECHA VINCULACION
    // V=21:CUENTA AER, W=22:CUENTA EDE, X=23:CUENTA EDSMC
    // Y=24–AL=37: MC I–XIV
    // AM=38:SE CANALIZA CISAMESP, AN=39:FECHA CANALIZACION, AO=40:LUGAR VIGILANCIA
    // AP=41:A DISPOSICION, AQ=42:FOTO PERSONA(skip), AR=43:FOTO DOMICILIO(skip)
    // AS=44:PRESENTACION PERIODICA, AT=45:No BIOMETRICO, AU=46:No LIBRO, AV=47:No PAGINA
    // AW=48:CUMPLIENDO O INCUMPLIENDO
    // AX=49:ESTATUS DE LA EXP. SMC Y CAUSA PENAL, AY=50:UBICACION ESTADO PROCESAL
    // AZ=51:DISTRITO JUDICIAL, BA=52:ULTIMO INFORME MC, BB=53:ACUERDO REPARATORIO
    // BC=54:FECHA CELEBRACION AR, BD=55:FECHA CUMPLIMIENTO AR, BE=56:VERIFICACION AR(skip)
    // BF=57:FORMA CONCLUSION, BG=58:FECHA TERMINO MC
    // BH=59:FECHA ENVIO ARCHIVO(skip), BI=60:SCP flag(skip), BJ=61:FECHA IMPOSICION SCP
    // BK=62:desconocido(skip), BL=63:PLAZO SCP
    // BM=64–BZ=77:I-XIV SCP(skip), CA=78:PRIMERA VISITA, CB=79:SEGUNDA VISITA, CC=80:TERCERA VISITA
    // CD=81:CANALIZACION, CE=82:TIPO SERVICIO
    // CF=83–CJ=87:datos SCP duplicados(skip)
    // CK=88:ULTIMO INFORME SCP, CL=89:VENCIMIENTO PLAZO SCP, CM=90:FORMA CONCLUSION SCP(skip)
    // CN=91:OFICIO SOBRESEIMIENTO, CO=92:FECHA ENVIO ARCHIVO 50(skip), CP=93:FECHA INFORME FINAL
    // CQ=94:OBSERVACIONES
    private ExpedienteAnteriorDTO parsearFilaHistorico(Row row, ExpedienteAnteriorDTO dto) {
        dto.setNumero(str(row, 0));
        dto.setEstatus(str(row, 1));
        dto.setResponsable(str(row, 2));
        // Nombre completo en un solo campo → lo guardamos en nombre
        dto.setNombre(str(row, 3));
        dto.setCausaPenal(str(row, 4));
        dto.setGenero(str(row, 5));
        dto.setFechaRecepcion(fecha(row, 6));       // FECHA ASIGNACION
        dto.setSede(str(row, 7));                   // SEDE JUDICIAL
        dto.setFechaNacimiento(fecha(row, 8));
        dto.setEdad(entero(row, 9));
        dto.setCalle(str(row, 10));                 // DOMICILIO (campo único)
        dto.setTelefono1(str(row, 11));
        dto.setOcupacion(str(row, 12));

        // Víctima 1
        dto.setVictima1Nombre(str(row, 13));
        dto.setVictima1Genero(str(row, 14));
        dto.setVictima1Domicilio(str(row, 15));
        dto.setVictima1Telefono(str(row, 16));

        dto.setDelito(str(row, 17));
        dto.setModalidad(str(row, 18));
        dto.setFechaFormulacion(fecha(row, 19));
        dto.setFechaVinculacionProceso(fecha(row, 20));
        // 21=CUENTA AER, 22=CUENTA EDE, 23=CUENTA EDSMC → se almacenan como flags
        dto.setNoAplicaMpNoSolicito(bool(row, 21));
        dto.setNoAplicaSinTiempo(bool(row, 22));
        dto.setNoAplicaPersonaNoAccedio(bool(row, 23));

        // Medidas cautelares I–XIV (cols 24–37)
        dto.setMcI(bool(row, 24));   dto.setMcIi(bool(row, 25));  dto.setMcIii(bool(row, 26));
        dto.setMcIv(bool(row, 27));  dto.setMcV(bool(row, 28));   dto.setMcVi(bool(row, 29));
        dto.setMcVii(bool(row, 30)); dto.setMcViii(bool(row, 31));dto.setMcIx(bool(row, 32));
        dto.setMcX(bool(row, 33));   dto.setMcXi(bool(row, 34));  dto.setMcXii(bool(row, 35));
        dto.setMcXiii(bool(row, 36));dto.setMcXiv(bool(row, 37));

        dto.setTipoServicio(str(row, 38));          // SE CANALIZA A TERAPIA CISAMESP
        dto.setFechaCanalizacion(fecha(row, 39));
        dto.setCoordenadasDomicilio(str(row, 40));  // LUGAR DE VIGILANCIA
        dto.setADisposicion(str(row, 41));
        // 42, 43 = fotos → skip
        dto.setPresentacionPeriodica(str(row, 44));
        dto.setNoBiometrico(str(row, 45));
        dto.setNoLibro(str(row, 46));
        dto.setNoPagina(str(row, 47));
        dto.setCumpliendoIncumpliendo(str(row, 48));

        // AX=49: ESTATUS DE LA EXP. S.M.C. y CAUSA PENAL
        dto.setEstatusFinal(str(row, 49));
        // AY=50: UBICACION DEL ESTADO PROCESAL DE LA CAUSA PENAL
        dto.setEstadoFinal(str(row, 50));
        // AZ=51: DISTRITO JUDICIAL A DONDE SE DECLINO LA COMPETENCIA
        dto.setDistritoJudicial(str(row, 51));
        // BA=52: ULTIMO INFORME MC
        dto.setUltimoInformeMc(str(row, 52));
        // BB=53: ACUERDO REPARATORIO
        dto.setAcuerdoReparatorio(str(row, 53));
        // BC=54: FECHA DE CELEBRACION DEL ACUERDO REPARATORIO
        dto.setFechaAcuerdoReparatorio(fecha(row, 54));
        // BD=55: FECHA DEL CUMPLIMIENTO O NO DEL ACUERDO REPARATORIO
        dto.setFechaCumplimientoAcuerdo(fecha(row, 55));
        // BE=56: VERIFICACION DEL CUMPLIMIENTO DEL A.R. → skip (sin campo)
        // BF=57: FORMA DE CONCLUSION DE LA CAUSA PENAL
        dto.setResponsableCierreCarpeta(str(row, 57));
        // BG=58: FECHA DE TERMINO DE LAS M.C.
        dto.setFechaTerminoMc(fecha(row, 58));
        // BH=59: FECHA DE ENVIO DEL EXP. AL ARCHIVO → skip
        // BI=60: S.C.P. (flag) → skip
        // BJ=61: FECHA DE IMPOSICION DE LA SCP
        dto.setFechaImposicionScp(fecha(row, 61));
        // BK=62: campo desconocido → skip
        // BL=63: PLAZO DE LA S.C.P.
        dto.setPlazoScp(str(row, 63));
        // BM=64 – BZ=77: I-XIV S.C.P. → skip (ya capturamos MC I-XIV en cols 24-37)
        // CA=78: PRIMERA VISITA
        dto.setPrimeraVisita(fecha(row, 78));
        dto.setSegundaVisita(fecha(row, 79));        // CB=79
        dto.setTerceraVisita(fecha(row, 80));        // CC=80
        // CD=81: CANALIZACION
        dto.setAjuste(str(row, 81));
        // CE=82: TIPO DE SERVICIO (sobrescribe si tiene valor)
        dto.setTipoServicio(str(row, 82));
        // CF=83: FECHA DE CANALIZACION SCP → skip (ya capturamos MC en col 39)
        // CG=84: PRESENTACION PERIODICA SCP → skip
        // CH=85: CUMPLIENDO O INCUMPLIENDO SCP → skip
        // CI=86: LIBRO SCP → skip (ya tenemos libro MC en col 46)
        // CJ=87: PAGINA SCP → skip
        // CK=88: ULTIMO INFORME SCP (usa si no hay MC)
        String ultInfScp = str(row, 88);
        if (ultInfScp != null) dto.setUltimoInformeMc(ultInfScp);
        // CL=89: VENCIMIENTO DEL PLAZO DE LA SCP
        dto.setVencimientoPlazoScp(fecha(row, 89));
        // CM=90: FORMA DE CONCLUSION (SCP duplicado) → skip
        // CN=91: OFICIO DE SOBRESEIMIENTO
        dto.setOficioSobreseimiento(str(row, 91));
        // CO=92: FECHA DE ENVIO DEL EXP. AL ARCHIVO 50 → skip
        // CP=93: FECHA DE INFORME FINAL
        dto.setFechaInformeFinal(fecha(row, 93));
        // CQ=94 + CR=95: OBSERVACIONES (dos campos, se concatenan)
        String obs1 = str(row, 94);
        String obs2 = str(row, 95);
        if (obs1 != null && obs2 != null) dto.setObservaciones(obs1 + "\n" + obs2);
        else if (obs1 != null) dto.setObservaciones(obs1);
        else if (obs2 != null) dto.setObservaciones(obs2);

        // CS=96+: Seguimientos (hasta 20)
        List<String> segsH = new ArrayList<>();
        for (int s = 0; s < MAX_SEGUIMIENTOS; s++) {
            String seg = str(row, 96 + s);
            if (seg != null && !seg.isBlank()) segsH.add(seg);
        }
        if (!segsH.isEmpty()) dto.setSeguimientos(segsH);

        return dto;
    }

    private boolean esFilaVaciaHistorico(Row row) {
        // HISTORICO: col 3 = NOMBRE DEL IMPUTADO, col 4 = CAUSA PENAL
        return str(row, 3) == null && str(row, 4) == null;
    }

    // ── Helpers ──────────────────────────────────────────────
    private String str(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING  -> {
                String s = cell.getStringCellValue().trim();
                yield s.isEmpty() ? null : s;
            }
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    // Celda fecha → devolver como texto formateado (ej. "2014" o fecha completa)
                    org.apache.poi.ss.usermodel.DataFormatter fmt = new org.apache.poi.ss.usermodel.DataFormatter();
                    String s = fmt.formatCellValue(cell).trim();
                    yield s.isEmpty() ? null : s;
                }
                double d = cell.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    CellType t = cell.getCachedFormulaResultType();
                    if (t == CellType.STRING) {
                        String s = cell.getStringCellValue().trim();
                        yield s.isEmpty() ? null : s;
                    }
                    if (t == CellType.NUMERIC) {
                        double d = cell.getNumericCellValue();
                        yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
                    }
                } catch (Exception ignored) {}
                yield null;
            }
            default -> null;
        };
    }

    private LocalDate fecha(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                Date d = cell.getDateCellValue();
                LocalDate ld = d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                return fechaValida(ld) ? ld : null;
            }
            if (cell.getCellType() == CellType.STRING) {
                String s = cell.getStringCellValue().trim();
                if (s.isEmpty()) return null;
                // Soporta dd-MM-yyyy, yyyy-MM-dd, dd/MM/yyyy
                String[] partes = s.split("[-/]");
                if (partes.length == 3) {
                    LocalDate ld;
                    if (partes[0].length() == 4)
                        ld = LocalDate.of(Integer.parseInt(partes[0]), Integer.parseInt(partes[1]), Integer.parseInt(partes[2]));
                    else
                        ld = LocalDate.of(Integer.parseInt(partes[2]), Integer.parseInt(partes[1]), Integer.parseInt(partes[0]));
                    return fechaValida(ld) ? ld : null;
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    /** Valida que la fecha esté en un rango razonable (1900–2100). */
    private boolean fechaValida(LocalDate ld) {
        return ld != null && ld.getYear() >= 1900 && ld.getYear() <= 2100;
    }

    private Boolean bool(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case BOOLEAN -> cell.getBooleanCellValue();
            case STRING  -> {
                String s = cell.getStringCellValue().trim().toLowerCase();
                yield !s.isEmpty() && !s.equals("no") && !s.equals("0") && !s.equals("false");
            }
            case NUMERIC -> cell.getNumericCellValue() != 0;
            default -> null;
        };
    }

    private Integer entero(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) return (int) cell.getNumericCellValue();
            if (cell.getCellType() == CellType.STRING) return Integer.parseInt(cell.getStringCellValue().trim());
        } catch (Exception ignored) {}
        return null;
    }

    private boolean esFilaVacia(Row row) {
        // Considera vacía si las columnas clave (nombre, causa penal) están vacías
        return str(row, 5) == null && str(row, 3) == null && str(row, 37) == null;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REGISTRO_HISTORICO — columnas: CAUSA PENAL | NOMBRE | FECHA | SITUACION JURIDICA
    // Encabezados en fila 1, datos desde fila 2. Parser por nombre de header.
    // ══════════════════════════════════════════════════════════════════════════

    public List<ExpedienteAnteriorDTO> parsearRegistroHistorico(MultipartFile file, String zona) throws Exception {
        List<ExpedienteAnteriorDTO> lista = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {
            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                String nombreHoja = sheet.getSheetName().trim().toUpperCase()
                        .replace("Ó","O").replace("Ó","O");
                if (!nombreHoja.startsWith("HIST")) continue; // solo hoja HISTORICO
                Row header = sheet.getRow(0);
                if (header == null) continue;
                Map<String, Integer> cols = mapearHeaders(header);
                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;
                    String causaPenal = strH(row, cols, "CAUSA PENAL");
                    String nombre     = strH(row, cols, "NOMBRE");
                    if ((causaPenal == null || causaPenal.isBlank()) &&
                        (nombre == null || nombre.isBlank())) continue; // fila vacía
                    ExpedienteAnteriorDTO dto = new ExpedienteAnteriorDTO();
                    dto.setTipo("REGISTRO_HISTORICO");
                    dto.setZona(zona);
                    dto.setCausaPenal(causaPenal);
                    dto.setNombre(nombre);
                    dto.setFechaRegistroHist(fechaH(row, cols, "FECHA"));
                    dto.setSituacionJuridica(strH(row, cols, "SITUACION JURIDICA"));
                    lista.add(dto);
                }
            }
        }
        return lista;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SUSTRAIDO — hojas: CUERNAVACA | JOJUTLA | CUAUTLA (zona = nombre hoja)
    // Columnas variables por hoja → parser por nombre de header.
    // Campos: ARCHIVO | PENAL | MC ó SCP | NOMBRE | SUSTRACCIÓN | SUPERVISOR | ESTATUS
    // ══════════════════════════════════════════════════════════════════════════

    public List<ExpedienteAnteriorDTO> parsearSustraidos(MultipartFile file) throws Exception {
        List<ExpedienteAnteriorDTO> lista = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {
            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                String nombreHoja = sheet.getSheetName().trim().toUpperCase()
                        .replace("Á","A").replace("É","E").replace("Í","I")
                        .replace("Ó","O").replace("Ú","U");
                // Zona por nombre de hoja
                String zona;
                if      (nombreHoja.contains("CUERNAVACA")) zona = "XOCHITEPEC";
                else if (nombreHoja.contains("JOJUTLA"))    zona = "JOJUTLA";
                else if (nombreHoja.contains("CUAUTLA"))    zona = "CUAUTLA";
                else continue; // Hoja4 u otras → ignorar
                Row header = sheet.getRow(0);
                if (header == null) continue;
                Map<String, Integer> cols = mapearHeaders(header);
                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;
                    // Busca causa penal con variantes del nombre de columna
                    String causaPenal = strH(row, cols, "PENAL", "CAUSA PENAL");
                    String nombre     = strH(row, cols, "NOMBRE");
                    if ((causaPenal == null || causaPenal.isBlank()) &&
                        (nombre == null || nombre.isBlank())) continue;
                    ExpedienteAnteriorDTO dto = new ExpedienteAnteriorDTO();
                    dto.setTipo("SUSTRAIDO");
                    dto.setZona(zona);
                    // Columna A sin encabezado → número de secuencia
                    Cell celdaNum = row.getCell(0);
                    if (celdaNum != null) {
                        if (celdaNum.getCellType() == CellType.NUMERIC)
                            dto.setNumero(String.valueOf((int) celdaNum.getNumericCellValue()));
                        else if (celdaNum.getCellType() == CellType.STRING && !celdaNum.getStringCellValue().isBlank())
                            dto.setNumero(celdaNum.getStringCellValue().trim());
                    }
                    dto.setArchivo(strH(row, cols,
                        "FECHA DE ARCHIVO TEMPORAL", // CUERNAVACA exacto
                        "FECHA ARCHIVO TEMPORAL",
                        "FECHA DE ARCHIVO",
                        "FECHA ARCHIVO",
                        "ARCHIVO"));
                    dto.setCausaPenal(causaPenal);
                    dto.setTipoMcScp(strH(row, cols, "MC O SCP", "MC Ó SCP", "MC ó SCP"));
                    dto.setNombre(nombre);
                    dto.setSustraccion(strH(row, cols,
                        "FECHA DE SUSTRACCION",   // CUERNAVACA exacto
                        "FECHA DE SUSTRACCI",     // por si queda incompleto
                        "SUSTRACCION",            // JOJUTLA / CUAUTLA
                        "FECHA SUSTRACCION"));
                    dto.setSupervisor(strH(row, cols,
                        "SUPERVISOR",             // CUERNAVACA / CUAUTLA / JOJUTLA
                        "R"));                    // fallback antiguo
                    dto.setEstatus(strH(row, cols,
                        "MODIFICACION DE ESTATUS", // CUERNAVACA exacto
                        "MODIFICACION ESTATUS",
                        "DE ESTATUS",
                        "N DE ESTATUS",
                        "ESTATUS"));
                    // Columna I (índice 8) — observaciones, sin encabezado en el Excel
                    String obsCol = str(row, 8);
                    if (obsCol != null && !obsCol.isBlank()) dto.setObservaciones(obsCol);
                    lista.add(dto);
                }
            }
        }
        return lista;
    }

    // ── Helpers para parser por header ────────────────────────────────────────

    /** Normaliza un texto: quita acentos, mayúsculas, recorta espacios extra. */
    private String norm(String s) {
        if (s == null) return "";
        // 1) NFD → quita diacríticos
        String nfd = Normalizer.normalize(s, Normalizer.Form.NFD);
        String sinAcentos = nfd.replaceAll("\\p{M}", "");
        // 2) fallback: quita cualquier carácter no-ASCII que haya quedado
        sinAcentos = sinAcentos.replaceAll("[^\\x00-\\x7F]", "");
        return sinAcentos.toUpperCase().trim().replaceAll("\\s+", " ");
    }

    /** Construye un mapa NOMBRE_HEADER_NORMALIZADO → índice de columna. */
    private Map<String, Integer> mapearHeaders(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        org.apache.poi.ss.usermodel.DataFormatter fmt = new org.apache.poi.ss.usermodel.DataFormatter();
        for (int c = 0; c <= headerRow.getLastCellNum(); c++) {
            Cell cell = headerRow.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            if (cell == null) continue;
            try {
                String nombre = norm(fmt.formatCellValue(cell));
                if (!nombre.isBlank()) map.put(nombre, c);
            } catch (Exception ignored) {}
        }
        return map;
    }

    /** Obtiene String de la columna cuyo header coincida con alguna de las variantes. */
    private String strH(Row row, Map<String, Integer> cols, String... variantes) {
        // Búsqueda exacta normalizada
        for (String v : variantes) {
            Integer idx = cols.get(norm(v));
            if (idx != null) {
                String val = str(row, idx);
                if (val != null && !val.isBlank()) return val;
            }
        }
        // Búsqueda parcial (contains) — por si el header tiene prefijo/sufijo extra
        for (String v : variantes) {
            String nv = norm(v);
            for (Map.Entry<String, Integer> entry : cols.entrySet()) {
                if (entry.getKey().contains(nv) || nv.contains(entry.getKey())) {
                    String val = str(row, entry.getValue());
                    if (val != null && !val.isBlank()) return val;
                }
            }
        }
        return null;
    }

    /** Obtiene LocalDate de la columna cuyo header coincida. */
    private LocalDate fechaH(Row row, Map<String, Integer> cols, String... variantes) {
        for (String v : variantes) {
            Integer idx = cols.get(norm(v));
            if (idx != null) {
                LocalDate val = fecha(row, idx);
                if (val != null) return val;
            }
        }
        return null;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BASE_JOJUTLA — múltiples hojas con tipos específicos por sede Jojutla
    // ══════════════════════════════════════════════════════════════════════════

    public List<ExpedienteAnteriorDTO> parsearBaseJojutla(MultipartFile file) throws Exception {
        List<ExpedienteAnteriorDTO> lista = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {

            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                String nombreHoja = norm(sheet.getSheetName());

                Row header = sheet.getRow(0);
                if (header == null) continue;
                Map<String, Integer> cols = mapearHeaders(header);

                String tipo;
                if      (nombreHoja.contains("SUSTRAIDO"))                                tipo = "JOJU_SUSTRAIDO";
                else if (nombreHoja.contains("PRISION") || nombreHoja.contains("PRISIO")) tipo = "JOJU_PRISION";
                else if (nombreHoja.contains("DEFUNCION"))                                tipo = "JOJU_DEFUNCION";
                else if (nombreHoja.contains("SOBRESEIMIENTO") || nombreHoja.contains("ESPERA")) tipo = "JOJU_SOBRESEIMIENTO";
                else if (nombreHoja.contains("ARCHIVO"))                                  tipo = "JOJU_ARCHIVO";
                else if (nombreHoja.contains("CARPETAS") || nombreHoja.contains("INACTIVA")) tipo = "JOJU_CARPETAS_INACTIVAS";
                else continue;

                if ("JOJU_ARCHIVO".equals(tipo)) {
                    // Ordenar: primero los que tienen número, luego los sin número por nombre
                    List<ExpedienteAnteriorDTO> conNum = new ArrayList<>();
                    List<ExpedienteAnteriorDTO> sinNum = new ArrayList<>();
                    for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                        Row row = sheet.getRow(i);
                        if (row == null) continue;
                        String causaPenal = strH(row, cols, "CAUSA", "CAUSA PENAL");
                        String nombre     = strH(row, cols, "NOMBRE");
                        if (causaPenal == null && nombre == null) continue;
                        ExpedienteAnteriorDTO dto = new ExpedienteAnteriorDTO();
                        dto.setTipo(tipo);
                        dto.setZona("JOJUTLA");
                        String numStr = str(row, 0);
                        dto.setNumero(numStr);
                        dto.setCausaPenal(causaPenal);
                        dto.setNombre(nombre);
                        dto.setArchivo(strH(row, cols, "HA DE ENVIO ARCH", "FECHA ARCH", "ARCHIVO"));
                        dto.setDelito(strH(row, cols, "DELITO"));
                        dto.setTipoMcScp(strH(row, cols, "MC/SCP", "MC O SCP", "SCP"));
                        dto.setResolucion(strH(row, cols, "RESOLUCION", "RESOLUCIÓN"));
                        try {
                            Double.parseDouble(numStr != null ? numStr.trim() : "x");
                            conNum.add(dto);
                        } catch (NumberFormatException e) {
                            sinNum.add(dto);
                        }
                    }
                    conNum.sort(Comparator.comparingDouble(d -> {
                        try { return Double.parseDouble(d.getNumero().trim()); } catch (Exception e2) { return Double.MAX_VALUE; }
                    }));
                    sinNum.sort(Comparator.comparing(d -> d.getNombre() != null ? d.getNombre() : ""));
                    lista.addAll(conNum);
                    lista.addAll(sinNum);
                    continue;
                }

                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;
                    String causaPenal = strH(row, cols, "CAUSA PENAL", "CAUSA");
                    String nombre     = strH(row, cols, "NOMBRE");
                    if (causaPenal == null && nombre == null) continue;

                    ExpedienteAnteriorDTO dto = new ExpedienteAnteriorDTO();
                    dto.setTipo(tipo);
                    dto.setZona("JOJUTLA");
                    dto.setCausaPenal(causaPenal);
                    dto.setNombre(nombre);

                    switch (tipo) {
                        case "JOJU_SUSTRAIDO" -> {
                            dto.setResolucion(strH(row, cols, "RESOLUCION", "RESOLUCIÓN"));
                            dto.setSexo(strH(row, cols, "SEXO"));
                            dto.setObservaciones(strH(row, cols, "OBSERVACIONES"));
                        }
                        case "JOJU_PRISION" -> {
                            dto.setSexo(strH(row, cols, "SEXO"));
                            dto.setDelito(strH(row, cols, "DELITO"));
                            dto.setObservaciones(strH(row, cols, "OBSERVACIONES"));
                            dto.setResolucion(strH(row, cols, "RESOLUCION", "RESOLUCIÓN"));
                        }
                        case "JOJU_DEFUNCION" -> {
                            dto.setDelito(strH(row, cols, "DELITO"));
                            dto.setTipoMcScp(strH(row, cols, "MC/SCP", "MC O SCP"));
                            dto.setSexo(strH(row, cols, "SEXO"));
                            dto.setBitacora(strH(row, cols, "BITACORA", "BITÁCORA"));
                        }
                        case "JOJU_SOBRESEIMIENTO" -> {
                            dto.setTipoMcScp(strH(row, cols, "MC/SCP", "MC O SCP"));
                            dto.setSexo(strH(row, cols, "SEXO"));
                            dto.setDelito(strH(row, cols, "DELITO"));
                            dto.setEstatus(strH(row, cols, "ESTATUS"));
                            dto.setBitacora(strH(row, cols, "BITACORA", "BITÁCORA"));
                        }
                        case "JOJU_CARPETAS_INACTIVAS" -> {
                            dto.setSexo(strH(row, cols, "SEXO"));
                            dto.setDelito(strH(row, cols, "DELITO"));
                            // Concatenar todas las observaciones
                            List<String> obsAll = new ArrayList<>();
                            for (String obs : new String[]{"OBSERVACIONES","OBSERVACIONES 2","OBSERVACIONES 3","OBSERVACIONES 4","OBSERVACIONES 5","OBSERVACIONES 6"}) {
                                String v = strH(row, cols, obs);
                                if (v != null && !v.isBlank()) obsAll.add(v);
                            }
                            if (!obsAll.isEmpty()) dto.setObservaciones(String.join(" | ", obsAll));
                        }
                    }
                    lista.add(dto);
                }
            }
        }
        return lista;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BASE_CUAUTLA — múltiples hojas con tipos específicos por sede Cuautla
    // ══════════════════════════════════════════════════════════════════════════

    public List<ExpedienteAnteriorDTO> parsearBaseCuautla(MultipartFile file) throws Exception {
        List<ExpedienteAnteriorDTO> lista = new ArrayList<>();
        try (InputStream is = file.getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {

            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                String nombreHoja = norm(sheet.getSheetName());

                Row header = sheet.getRow(0);
                if (header == null) continue;
                Map<String, Integer> cols = mapearHeaders(header);

                String tipo;
                if      (nombreHoja.contains("PRISION") || nombreHoja.contains("PRISIO")) tipo = "CUAT_PRISION";
                else if (nombreHoja.contains("ESPERA"))                                    tipo = "CUAT_ESPERA";
                else if (nombreHoja.contains("CARPETAS") && nombreHoja.contains("CERRAR")) tipo = "CUAT_CARPETAS_CERRAR";
                else if (nombreHoja.contains("OFICIO"))                                    tipo = "CUAT_OFICIOS";
                else if (nombreHoja.contains("SUSTRAIDO"))                                 tipo = "CUAT_SUSTRAIDO";
                else if (nombreHoja.contains("TTA"))                                       tipo = "CUAT_TTA";
                else if (nombreHoja.contains("ARCHIVO"))                                   tipo = "CUAT_ARCHIVO";
                else continue;

                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;
                    String causaPenal = strH(row, cols, "CAUSA PENAL", "CAUSA", "CARPETA");
                    String nombre     = strH(row, cols, "NOMBRE", "NOMBRE COMPLETO");
                    if (causaPenal == null && nombre == null) continue;

                    ExpedienteAnteriorDTO dto = new ExpedienteAnteriorDTO();
                    dto.setTipo(tipo);
                    dto.setZona("CUAUTLA");
                    dto.setCausaPenal(causaPenal);
                    dto.setNombre(nombre);

                    switch (tipo) {
                        case "CUAT_PRISION" -> {
                            dto.setEstatus(strH(row, cols, "ESTATUS"));
                            dto.setObservaciones(strH(row, cols, "OBSERVACIONES"));
                            dto.setObservaciones2(strH(row, cols, "OBSERVACIONES 2"));
                        }
                        case "CUAT_ESPERA" -> {
                            dto.setNumero(strH(row, cols, "NO.", "NUMERO", "NO"));
                            dto.setDelito(strH(row, cols, "DELITO"));
                            dto.setJuez(strH(row, cols, "JUEZ"));
                            dto.setFechaImposicion(fechaH(row, cols, "FECHA DE IMPOSICION", "FECHA IMPOSICION"));
                            dto.setPlazo(strH(row, cols, "PLAZO"));
                            dto.setFechaVencimiento(fechaH(row, cols, "FECHA DE VENCIMIENTO", "FECHA VENCIMIENTO"));
                            dto.setObservaciones(strH(row, cols, "OBSERVACIONES"));
                            dto.setObservaciones2(strH(row, cols, "OBSERVACIONES 2"));
                        }
                        case "CUAT_CARPETAS_CERRAR" -> {
                            dto.setNumero(strH(row, cols, "NO.", "NUMERO", "NO"));
                        }
                        case "CUAT_OFICIOS" -> {
                            dto.setAsignado(strH(row, cols, "ASIGNADO"));
                        }
                        case "CUAT_SUSTRAIDO" -> {
                            dto.setCarpetaXochitepec(strH(row, cols, "CARPETAS ENVIADAS A XOCHITEPEC", "CARPETA XOCHITEPEC"));
                            dto.setArchivo(strH(row, cols, "FECHA DE ARCHIVO TEMPORAL", "FECHA ARCHIVO TEMPORAL", "ARCHIVO"));
                            dto.setTipoMcScp(strH(row, cols, "MC O SCP", "MC Ó SCP"));
                            dto.setSustraccion(strH(row, cols, "FECHA DE SUSTRACCION", "SUSTRACCION"));
                            dto.setEstatus(strH(row, cols, "MODIFICACION DE ESTATUS", "ESTATUS"));
                            dto.setSupervisor(strH(row, cols, "SUPERVISOR"));
                            dto.setObservaciones(strH(row, cols, "OBSERVACIONES"));
                        }
                        case "CUAT_TTA" -> {
                            dto.setVencimiento(fechaH(row, cols, "VENCIMIENTO"));
                            dto.setObservaciones(strH(row, cols, "OBSERVACIONES"));
                        }
                        case "CUAT_ARCHIVO" -> {
                            dto.setNumero(strH(row, cols, "NUMERO", "NO.", "NO"));
                            dto.setCierre(strH(row, cols, "CIERRE"));
                            dto.setTipoMcScp(strH(row, cols, "MC O SCP", "MC Ó SCP"));
                            dto.setMotivoCierre(strH(row, cols, "MOTIVO DE CIERRE", "MOTIVO CIERRE"));
                            dto.setObservaciones(strH(row, cols, "OBSERVACIONES", "OBSERVACION", "OBS"));
                        }
                    }
                    lista.add(dto);
                }
            }
        }
        return lista;
    }
}
