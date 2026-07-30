package mx.edu.utez.umeca.modules.expediente;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.web.multipart.MultipartFile;
import mx.edu.utez.umeca.modules.security.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ExpedienteAnteriorService {

    private final ExpedienteAnteriorRepository repo;
    private final ImportacionLoteRepository loteRepo;
    private final ObjectMapper objectMapper;
    private final ExpedienteExcelParser parser;

    // ── Importación masiva ───────────────────────────────────
    public ApiResponse importar(List<ExpedienteAnteriorDTO> dtos, String nombreArchivo) {
        try {
            return importarTransaccional(dtos, nombreArchivo);
        } catch (Exception e) {
            return new ApiResponse(false, "Error en la importación: " + e.getMessage());
        }
    }

    @Transactional
    public ApiResponse importarTransaccional(List<ExpedienteAnteriorDTO> dtos, String nombreArchivo) {
        try {
            List<ExpedienteAnterior> validos   = new ArrayList<>();
            int omitidos = 0;

            for (ExpedienteAnteriorDTO d : dtos) {
                // Validar que tenga al menos nombre o causa penal
                boolean tieneNombre     = d.getNombre()    != null && !d.getNombre().isBlank();
                boolean tieneApPaterno  = d.getApPaterno() != null && !d.getApPaterno().isBlank();
                boolean tieneCausaPenal = d.getCausaPenal()!= null && !d.getCausaPenal().isBlank();

                if (!tieneNombre && !tieneApPaterno && !tieneCausaPenal) {
                    omitidos++;
                    continue;
                }
                validos.add(toEntity(d));
            }

            if (validos.isEmpty()) {
                return new ApiResponse(false,
                    "No se encontraron registros válidos en el archivo. " +
                    "Verifica que las columnas del Excel coincidan con el formato esperado.");
            }

            // Crear lote de importación
            ImportacionLote lote = new ImportacionLote();
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                lote.setImportadoPor(auth != null ? auth.getName() : "sistema");
            } catch (Exception ignored) { lote.setImportadoPor("sistema"); }

            // Zona: si todos los registros son de la misma zona se asigna, si son multi-zona queda null
            long zonasDistintas = validos.stream()
                    .map(ExpedienteAnterior::getZona)
                    .filter(z -> z != null)
                    .distinct().count();
            if (zonasDistintas == 1) {
                lote.setZona(validos.stream().map(ExpedienteAnterior::getZona).filter(z -> z != null).findFirst().orElse(null));
            }
            // si zonasDistintas > 1 → lote.zona queda null (multi-zona)

            lote.setNombreArchivo(nombreArchivo);
            lote.setTotalOmitidos(omitidos);
            lote = loteRepo.save(lote);

            // Asignar loteId y contar por tipo
            int totalMc = 0, totalScp = 0, totalHist = 0;
            final Long loteId = lote.getId();
            for (ExpedienteAnterior e : validos) {
                e.setLoteId(loteId);
                if      (e.getTipo() == ExpedienteAnterior.TipoExpediente.MC)                totalMc++;
                else if (e.getTipo() == ExpedienteAnterior.TipoExpediente.SCP)               totalScp++;
                else if (e.getTipo() == ExpedienteAnterior.TipoExpediente.REGISTRO_HISTORICO) totalHist++;
                else if (e.getTipo() == ExpedienteAnterior.TipoExpediente.SUSTRAIDO)          totalHist++;
                else                                                                           totalHist++;
            }
            lote.setTotalMc(totalMc);
            lote.setTotalScp(totalScp);
            lote.setTotalHistorico(totalHist);
            loteRepo.save(lote);

            // Guardar en lotes de 500 para archivos grandes
            int batchSize = 500;
            for (int i = 0; i < validos.size(); i += batchSize) {
                repo.saveAll(validos.subList(i, Math.min(i + batchSize, validos.size())));
            }

            String msg = "Se importaron " + validos.size() + " expediente(s) correctamente.";
            if (omitidos > 0) msg += " Se omitieron " + omitidos + " fila(s) sin datos.";

            Map<String, Object> resultado = new java.util.HashMap<>();
            resultado.put("importados", validos.size());
            resultado.put("omitidos", omitidos);
            resultado.put("loteId", loteId);

            return new ApiResponse(true, msg, resultado);
        } catch (Exception e) {
            throw e; // se propaga al método importar() no-transaccional
        }
    }

    // ── Gestión de lotes ─────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse listarLotes() {
        return new ApiResponse(true, "ok", loteRepo.findAllByOrderByCreatedAtDesc());
    }

    @Transactional
    public ApiResponse eliminarLote(Long loteId) {
        if (!loteRepo.existsById(loteId))
            return new ApiResponse(false, "Lote no encontrado");
        int eliminados = repo.eliminarPorLote(loteId);
        loteRepo.deleteById(loteId);
        return new ApiResponse(true, "Se eliminaron " + eliminados + " expedientes del lote correctamente", eliminados);
    }

    // ── Consulta paginada ────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse listar(String tipo, String tipoIn, String zona, String busqueda, int pagina, int tam) {
        String t  = (tipo   != null && !tipo.isBlank())   ? tipo.trim()   : null;
        String ti = (tipoIn != null && !tipoIn.isBlank()) ? tipoIn.trim() : null;
        String z  = (zona   != null && !zona.isBlank())   ? zona.trim()   : null;
        String q  = (busqueda != null && !busqueda.isBlank()) ? busqueda.trim() : null;
        Page<ExpedienteAnterior> page = repo.buscar(t, ti, z, q, PageRequest.of(pagina, tam));
        return new ApiResponse(true, "ok", page);
    }

    // ── Detalle por id ───────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse detalle(Long id) {
        Optional<ExpedienteAnterior> opt = repo.findById(id);
        if (opt.isEmpty()) return new ApiResponse(false, "Expediente no encontrado");
        return new ApiResponse(true, "ok", opt.get());
    }

    // ── Mapeo DTO → Entidad ──────────────────────────────────
    private ExpedienteAnterior toEntity(ExpedienteAnteriorDTO d) {
        ExpedienteAnterior e = new ExpedienteAnterior();

        try { e.setTipo(ExpedienteAnterior.TipoExpediente.valueOf(d.getTipo())); } catch (Exception ignored) { e.setTipo(ExpedienteAnterior.TipoExpediente.MC); }
        try { e.setZona(ExpedienteAnterior.Zona.valueOf(d.getZona())); } catch (Exception ignored) {}

        e.setNumero(d.getNumero());
        e.setEstatus(d.getEstatus());
        e.setResponsable(d.getResponsable());
        e.setApPaterno(d.getApPaterno());
        e.setApMaterno(d.getApMaterno());
        e.setNombre(d.getNombre());
        e.setGenero(d.getGenero());
        e.setFechaNacimiento(d.getFechaNacimiento());
        e.setEdad(d.getEdad());

        e.setIndigena(d.getIndigena());
        e.setEtniaPueblo(d.getEtniaPueblo());
        e.setAfrodescendiente(d.getAfrodescendiente());
        e.setExtranjeroMigrante(d.getExtranjeroMigrante());
        e.setComunidadLgbt(d.getComunidadLgbt());
        e.setDiscapacidad(d.getDiscapacidad());
        e.setGrupoVulnerableOtro(d.getGrupoVulnerableOtro());

        e.setCalle(d.getCalle());
        e.setNumeroExt(d.getNumeroExt());
        e.setColonia(d.getColonia());
        e.setMunicipio(d.getMunicipio());
        e.setEstadoDomicilio(d.getEstadoDomicilio());
        e.setTelefono1(d.getTelefono1());
        e.setTelefono2(d.getTelefono2());
        e.setOcupacion(d.getOcupacion());

        e.setVictima1Tipo(d.getVictima1Tipo());
        e.setVictima1Nombre(d.getVictima1Nombre());
        e.setVictima1Genero(d.getVictima1Genero());
        e.setVictima1Domicilio(d.getVictima1Domicilio());
        e.setVictima1Telefono(d.getVictima1Telefono());
        e.setVictima2Tipo(d.getVictima2Tipo());
        e.setVictima2Nombre(d.getVictima2Nombre());
        e.setVictima2Genero(d.getVictima2Genero());
        e.setVictima2Domicilio(d.getVictima2Domicilio());
        e.setVictima2Telefono(d.getVictima2Telefono());

        // SCP
        e.setFechaInicioSupervision(d.getFechaInicioSupervision());
        e.setFechaImposicionScp(d.getFechaImposicionScp());
        e.setPlazoScp(d.getPlazoScp());
        e.setFechaConclusionScp(d.getFechaConclusionScp());
        e.setPrimeraVisita(d.getPrimeraVisita());
        e.setSegundaVisita(d.getSegundaVisita());
        e.setTerceraVisita(d.getTerceraVisita());
        e.setTipoServicio(d.getTipoServicio());
        e.setFechaInformeFinal(d.getFechaInformeFinal());
        e.setVencimientoPlazoScp(d.getVencimientoPlazoScp());
        e.setOficioSobreseimiento(d.getOficioSobreseimiento());
        e.setResponsableCierreCarpeta(d.getResponsableCierreCarpeta());
        e.setAjuste(d.getAjuste());
        e.setNumeroExpedienteArchivo(d.getNumeroExpedienteArchivo());

        e.setFechaRecepcion(d.getFechaRecepcion());
        e.setCausaPenal(d.getCausaPenal());
        e.setDelito(d.getDelito());
        e.setModalidad(d.getModalidad());
        e.setSede(d.getSede());
        e.setNombreJuez(d.getNombreJuez());
        e.setFechaFormulacion(d.getFechaFormulacion());
        e.setFechaVinculacionProceso(d.getFechaVinculacionProceso());
        e.setFechaEntrevistaEvaluacion(d.getFechaEntrevistaEvaluacion());

        e.setFechaAudienciaImposicion(d.getFechaAudienciaImposicion());
        e.setFechaEntrevistaEncuadre(d.getFechaEntrevistaEncuadre());
        e.setRiesgoSustraccion(d.getRiesgoSustraccion());
        e.setRiesgoObstaculizacion(d.getRiesgoObstaculizacion());
        e.setRiesgoVictima(d.getRiesgoVictima());
        e.setOpinionTecnicaRiesgos(d.getOpinionTecnicaRiesgos());
        e.setInforme(d.getInforme());
        e.setNoAplicaMpNoSolicito(d.getNoAplicaMpNoSolicito());
        e.setNoAplicaSinTiempo(d.getNoAplicaSinTiempo());
        e.setNoAplicaPersonaNoAccedio(d.getNoAplicaPersonaNoAccedio());
        e.setNoAplicaSinFuentes(d.getNoAplicaSinFuentes());
        e.setNoAplicaOtro(d.getNoAplicaOtro());

        e.setMcI(d.getMcI());     e.setMcIi(d.getMcIi());   e.setMcIii(d.getMcIii());
        e.setMcIv(d.getMcIv());   e.setMcV(d.getMcV());     e.setMcVi(d.getMcVi());
        e.setMcVii(d.getMcVii()); e.setMcViii(d.getMcViii());e.setMcIx(d.getMcIx());
        e.setMcX(d.getMcX());     e.setMcXi(d.getMcXi());   e.setMcXii(d.getMcXii());
        e.setMcXiii(d.getMcXiii());e.setMcXiv(d.getMcXiv());

        e.setFechaCanalizacion(d.getFechaCanalizacion());
        e.setADisposicion(d.getADisposicion());
        e.setCoordenadasDomicilio(d.getCoordenadasDomicilio());
        e.setPresentacionPeriodica(d.getPresentacionPeriodica());
        e.setNoBiometrico(d.getNoBiometrico());
        e.setNoLibro(d.getNoLibro());
        e.setNoPagina(d.getNoPagina());
        e.setCumpliendoIncumpliendo(d.getCumpliendoIncumpliendo());
        e.setDistritoJudicial(d.getDistritoJudicial());
        e.setUltimoInformeMc(d.getUltimoInformeMc());
        e.setAcuerdoReparatorio(d.getAcuerdoReparatorio());
        e.setFechaAcuerdoReparatorio(d.getFechaAcuerdoReparatorio());
        e.setFechaCumplimientoAcuerdo(d.getFechaCumplimientoAcuerdo());
        e.setEstatusFinal(d.getEstatusFinal());
        e.setFechaTerminoMc(d.getFechaTerminoMc());
        e.setEstadoFinal(d.getEstadoFinal());

        // Seguimientos → JSON
        if (d.getSeguimientos() != null && !d.getSeguimientos().isEmpty()) {
            try { e.setSeguimientos(objectMapper.writeValueAsString(d.getSeguimientos())); }
            catch (JsonProcessingException ignored) {}
        }
        e.setObservaciones(d.getObservaciones());

        // REGISTRO_HISTORICO
        e.setFechaRegistroHist(d.getFechaRegistroHist());
        e.setSituacionJuridica(d.getSituacionJuridica());

        // SUSTRAIDO
        e.setArchivo(d.getArchivo());
        e.setTipoMcScp(d.getTipoMcScp());
        e.setSustraccion(d.getSustraccion());
        e.setSupervisor(d.getSupervisor());

        // Campos nuevos Base Jojutla / Cuautla
        e.setResolucion(d.getResolucion());
        e.setSexo(d.getSexo());
        e.setBitacora(d.getBitacora());
        e.setJuez(d.getJuez());
        e.setFechaImposicion(d.getFechaImposicion());
        e.setPlazo(d.getPlazo());
        e.setFechaVencimiento(d.getFechaVencimiento());
        e.setAsignado(d.getAsignado());
        e.setVencimiento(d.getVencimiento());
        e.setMotivoCierre(d.getMotivoCierre());
        e.setCierre(d.getCierre());
        e.setObservaciones2(d.getObservaciones2());
        e.setObservaciones3(d.getObservaciones3());
        e.setObservaciones4(d.getObservaciones4());
        e.setObservaciones5(d.getObservaciones5());
        e.setObservaciones6(d.getObservaciones6());
        e.setCarpetaXochitepec(d.getCarpetaXochitepec());

        return e;
    }

    // ── Importar Registro Histórico ──────────────────────────
    public ApiResponse importarRegistroHistorico(MultipartFile file, String zona) {
        try {
            List<ExpedienteAnteriorDTO> dtos = parser.parsearRegistroHistorico(file, zona);
            return importarTransaccional(dtos, file.getOriginalFilename());
        } catch (Exception e) {
            return new ApiResponse(false, "Error al procesar el archivo: " + e.getMessage());
        }
    }

    // ── Importar Sustraídos ──────────────────────────────────
    public ApiResponse importarSustraidos(MultipartFile file) {
        try {
            List<ExpedienteAnteriorDTO> dtos = parser.parsearSustraidos(file);
            return importarTransaccional(dtos, file.getOriginalFilename());
        } catch (Exception e) {
            return new ApiResponse(false, "Error al procesar el archivo: " + e.getMessage());
        }
    }

    // ── Importar Base Jojutla ────────────────────────────────
    public ApiResponse importarBaseJojutla(MultipartFile file) {
        try {
            List<ExpedienteAnteriorDTO> dtos = parser.parsearBaseJojutla(file);
            return importar(dtos, file.getOriginalFilename());
        } catch (Exception e) {
            return new ApiResponse(false, "Error al procesar el archivo: " + e.getMessage());
        }
    }

    // ── Importar Base Cuautla ────────────────────────────────
    public ApiResponse importarBaseCuautla(MultipartFile file) {
        try {
            List<ExpedienteAnteriorDTO> dtos = parser.parsearBaseCuautla(file);
            return importar(dtos, file.getOriginalFilename());
        } catch (Exception e) {
            return new ApiResponse(false, "Error al procesar el archivo: " + e.getMessage());
        }
    }

    // ── Importar Inactivos Xochitepec ────────────────────────
    public ApiResponse importarInactivosXochi(MultipartFile file) {
        try {
            List<ExpedienteAnteriorDTO> dtos = parser.parsearInactivosXochi(file);
            return importar(dtos, file.getOriginalFilename());
        } catch (Exception e) {
            return new ApiResponse(false, "Error al procesar el archivo: " + e.getMessage());
        }
    }

    public ApiResponse importarCierreCarpetas(MultipartFile file) {
        try {
            List<ExpedienteAnteriorDTO> dtos = parser.parsearCierreCarpetas(file);
            return importarTransaccional(dtos, file.getOriginalFilename());
        } catch (Exception e) {
            return new ApiResponse(false, "Error al procesar el archivo: " + e.getMessage());
        }
    }
}
