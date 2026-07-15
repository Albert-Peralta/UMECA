package mx.edu.utez.umeca.modules.entrevista;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.imputado.Imputado;
import mx.edu.utez.umeca.modules.imputado.ImputadoRepository;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Lógica de negocio para la entrevista de encuadre del imputado.
 * Valida edad (mayor de 18), genera folios secuenciales por año,
 * y evita duplicados de personas con entrevista activa.
 */
@Service
@RequiredArgsConstructor
public class EntrevistaEncuadreService {

    private final EntrevistaEncuadreRepository repository;
    private final UserRepository userRepository;
    private final ImputadoRepository imputadoRepository;
    private final BitacoraService bitacoraService;

    @Transactional(readOnly = true)
    public ApiResponse findAll() {
        return new ApiResponse(true, "Entrevistas obtenidas", repository.findAll());
    }

    /**
     * Búsqueda ligera para pre-llenar datos al crear una medida cautelar.
     * Devuelve un DTO reducido, no la entidad completa.
     */
    @Transactional(readOnly = true)
    public ApiResponse buscar(String q) {
        List<EntrevistaPreLlenadoDTO> result = repository.buscarParaMedida(q)
                .stream().map(EntrevistaPreLlenadoDTO::from).toList();
        return new ApiResponse(true, "OK", result);
    }

    @Transactional(readOnly = true)
    public ApiResponse findById(Long id) {
        return repository.findById(id)
                .map(e -> new ApiResponse(true, "Entrevista encontrada", e))
                .orElse(new ApiResponse(false, "Entrevista no encontrada"));
    }

    /**
     * Registra una nueva entrevista de encuadre.
     * Pasos clave:
     * 1. Calcula la edad y rechaza menores de 18.
     * 2. Bloquea si ya existe una entrevista PENDIENTE o EN_REVISION para la misma persona.
     * 3. Genera el folio secuencial con formato ENT-{AÑO}-{NNN}.
     * 4. Crea o actualiza el imputado vinculado por causa penal.
     * 5. Inyecta la referencia de entrevista en colecciones hija antes de persistir.
     */
    @Transactional
    public ApiResponse save(EntrevistaEncuadre entrevista) {
        if (entrevista.getFechaNacimiento() != null) {
            int edad = java.time.Period.between(entrevista.getFechaNacimiento(), LocalDate.now()).getYears();
            if (edad < 18)
                return new ApiResponse(false, "El imputado debe ser mayor de 18 años");
            entrevista.setEdad(edad); // auto-calcular
        }

        var estados = List.of(EntrevistaEncuadre.Estado.PENDIENTE, EntrevistaEncuadre.Estado.EN_REVISION);
        var activa = entrevista.getApMaterno() != null && !entrevista.getApMaterno().isBlank()
                ? repository.findFirstByNombreIgnoreCaseAndApPaternoIgnoreCaseAndApMaternoIgnoreCaseAndEstadoIn(
                        entrevista.getNombre(), entrevista.getApPaterno(), entrevista.getApMaterno(), estados)
                : repository.findFirstByNombreIgnoreCaseAndApPaternoIgnoreCaseAndApMaternoIsNullAndEstadoIn(
                        entrevista.getNombre(), entrevista.getApPaterno(), estados);
        if (activa.isPresent()) {
            return new ApiResponse(false,
                    "Ya existe una entrevista activa para esta persona (" + activa.get().getFolio() + ")");
        }

        String anio = String.valueOf(LocalDate.now().getYear());
        String prefix = "ENT-" + anio + "-";
        long count = repository.countByFolioStartingWith(prefix) + 1;
        entrevista.setFolio(prefix + String.format("%03d", count));

        entrevista.setFechaRegistro(LocalDate.now());

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByEmail(email).ifPresent(entrevista::setRegistradoPor);

        entrevista.setEstado(EntrevistaEncuadre.Estado.PENDIENTE);

        // Si viene imputadoId se vincula al existente; si no, se crea uno nuevo
        Imputado imputado;
        if (entrevista.getImputadoSelId() != null) {
            imputado = imputadoRepository.findById(entrevista.getImputadoSelId()).orElse(null);
            if (imputado == null) return new ApiResponse(false, "Imputado no encontrado");
        } else {
            imputado = new Imputado();
            imputado.setNombre(entrevista.getNombre());
            imputado.setApPaterno(entrevista.getApPaterno());
            imputado.setApMaterno(entrevista.getApMaterno());
            imputado.setCausaPenal(entrevista.getCausaPenal());
            if (entrevista.getFotoImputado() != null && !entrevista.getFotoImputado().isBlank()) {
                imputado.setFoto(entrevista.getFotoImputado());
            }
            imputadoRepository.save(imputado);
        }
        entrevista.setImputado(imputado);

        // Asignar referencia de entrevista a los domicilios antes de guardar
        if (entrevista.getDomicilios() != null) {
            entrevista.getDomicilios().forEach(d -> d.setEntrevista(entrevista));
        }
        if (entrevista.getPersonasHabita() != null) {
            entrevista.getPersonasHabita().forEach(p -> p.setEntrevista(entrevista));
        }
        if (entrevista.getReferencias() != null) {
            entrevista.getReferencias().forEach(r -> r.setEntrevista(entrevista));
        }
        if (entrevista.getConsumoSustancias() != null) {
            entrevista.getConsumoSustancias().forEach(c -> c.setEntrevista(entrevista));
        }

        EntrevistaEncuadre savedEnt = repository.save(entrevista);
        bitacoraService.registrar(Bitacora.Entidad.ENTREVISTA, savedEnt.getId(),
                savedEnt.getNombre() + " " + savedEnt.getApPaterno(),
                Bitacora.Accion.CREAR,
                "Entrevista registrada. Folio: " + savedEnt.getFolio());
        return new ApiResponse(true, "Entrevista registrada", savedEnt);
    }

    /**
     * Actualiza una entrevista existente.
     * Las colecciones (domicilios, referencias, etc.) se reemplazan completamente:
     * se limpia la lista y se reinsertan los elementos nuevos con id=null
     * para evitar el error "detached entity passed to persist".
     */
    @Transactional
    public ApiResponse update(Long id, EntrevistaEncuadre entrevista) {
        return repository.findById(id).map(existing -> {
            // Captura cambios antes de modificar
            java.util.List<String> cambios = new java.util.ArrayList<>();
            if (!java.util.Objects.equals(existing.getNombre(), entrevista.getNombre())
                    || !java.util.Objects.equals(existing.getApPaterno(), entrevista.getApPaterno()))
                cambios.add("Nombre actualizado");
            if (!java.util.Objects.equals(existing.getCausaPenal(), entrevista.getCausaPenal()))
                cambios.add("Causa penal: " + entrevista.getCausaPenal());
            if (!java.util.Objects.equals(existing.getEstado(), entrevista.getEstado()) && entrevista.getEstado() != null)
                cambios.add("Estado: " + (existing.getEstado() != null ? existing.getEstado().name() : "—")
                        + " → " + entrevista.getEstado().name());
            if (!java.util.Objects.equals(existing.getTelefonoCasa(), entrevista.getTelefonoCasa()))
                cambios.add("Teléfono actualizado");
            if (!java.util.Objects.equals(existing.getCelular(), entrevista.getCelular()))
                cambios.add("Celular actualizado");
            if (!java.util.Objects.equals(existing.getDomicilios(), entrevista.getDomicilios()))
                cambios.add("Domicilio actualizado");
            if (!java.util.Objects.equals(existing.getTipoSeguimiento(), entrevista.getTipoSeguimiento())
                    && entrevista.getTipoSeguimiento() != null)
                cambios.add("Tipo seguimiento: " + entrevista.getTipoSeguimiento());
            String descCambios = cambios.isEmpty() ? "Entrevista actualizada" : String.join(". ", cambios);

            existing.setNombre(entrevista.getNombre());
            existing.setApPaterno(entrevista.getApPaterno());
            existing.setApMaterno(entrevista.getApMaterno());

            // Sincronizar imputado
            if (existing.getImputado() != null) {
                Imputado imp = existing.getImputado();
                imp.setNombre(entrevista.getNombre());
                imp.setApPaterno(entrevista.getApPaterno());
                imp.setApMaterno(entrevista.getApMaterno());
                imputadoRepository.save(imp);
            }
            existing.setCausaPenal(entrevista.getCausaPenal());
            existing.setTelefonoCasa(entrevista.getTelefonoCasa());
            existing.setCelular(entrevista.getCelular());
            existing.setEmail(entrevista.getEmail());
            existing.setFechaNacimiento(entrevista.getFechaNacimiento());
            // Recalcular edad automáticamente
            if (entrevista.getFechaNacimiento() != null) {
                int edadCalc = java.time.Period.between(entrevista.getFechaNacimiento(), LocalDate.now()).getYears();
                if (edadCalc < 18)
                    return new ApiResponse(false, "El imputado debe ser mayor de edad");
                existing.setEdad(edadCalc);
            }
            existing.setMunicipio(entrevista.getMunicipio());
            existing.setEstadoNacimiento(entrevista.getEstadoNacimiento());
            existing.setPais(entrevista.getPais());
            existing.setEnfermedad(entrevista.getEnfermedad());
            existing.setGradoEstudios(entrevista.getGradoEstudios());
            existing.setGenero(entrevista.getGenero());
            existing.setComplexion(entrevista.getComplexion());
            existing.setEstatura(entrevista.getEstatura());
            existing.setColorOjos(entrevista.getColorOjos());
            existing.setCejas(entrevista.getCejas());
            existing.setTezPiel(entrevista.getTezPiel());
            existing.setColorCabello(entrevista.getColorCabello());
            existing.setTamLabios(entrevista.getTamLabios());
            existing.setSenasCara(entrevista.getSenasCara());
            existing.setTieneTatuajes(entrevista.getTieneTatuajes());
            existing.setAlias(entrevista.getAlias());
            existing.setDocumentosMigratorios(entrevista.getDocumentosMigratorios());
            existing.setEstadoCivil(entrevista.getEstadoCivil());
            existing.setGrupoVulnerable(entrevista.getGrupoVulnerable());
            existing.setConoceVictima(entrevista.getConoceVictima());
            existing.setTelVictima(entrevista.getTelVictima());
            existing.setNombreVictima(entrevista.getNombreVictima());
            existing.setDomicilioVictima(entrevista.getDomicilioVictima());
            existing.setEmpresa(entrevista.getEmpresa());
            existing.setTelEmpresa(entrevista.getTelEmpresa());
            existing.setSalarioMensual(entrevista.getSalarioMensual());
            existing.setPuesto(entrevista.getPuesto());
            existing.setNombreJefe(entrevista.getNombreJefe());
            existing.setHorarioTrabajo(entrevista.getHorarioTrabajo());
            existing.setDomicilioTrabajo(entrevista.getDomicilioTrabajo());
            existing.setUltimoEmpleo(entrevista.getUltimoEmpleo());
            existing.setTipoSeguimiento(entrevista.getTipoSeguimiento());
            existing.setTratamientoAdicciones(entrevista.getTratamientoAdicciones());
            existing.setTratamientoAdiccionesEsp(entrevista.getTratamientoAdiccionesEsp());
            existing.setFamiliaresConsumo(entrevista.getFamiliaresConsumo());
            existing.setFamiliaresConsumoEsp(entrevista.getFamiliaresConsumoEsp());
            existing.setBuenaBase(entrevista.getBuenaBase());
            existing.setBuenaBaseEsp(entrevista.getBuenaBaseEsp());
            existing.setObligacionesDificiles(entrevista.getObligacionesDificiles());
            existing.setObligacionesDificilesEsp(entrevista.getObligacionesDificilesEsp());

            // Si se completa
            if (entrevista.getEstado() == EntrevistaEncuadre.Estado.COMPLETADO
                    && existing.getEstado() != EntrevistaEncuadre.Estado.COMPLETADO) {
                existing.setFechaCompletado(LocalDateTime.now());
            }
            existing.setEstado(entrevista.getEstado());

            // ── Actualizar colecciones (reemplazar con orphanRemoval) ──
            // Se resetea el id para evitar "detached entity passed to persist"
            if (entrevista.getDomicilios() != null) {
                existing.getDomicilios().clear();
                entrevista.getDomicilios().forEach(d -> { d.setId(null); d.setEntrevista(existing); existing.getDomicilios().add(d); });
            }
            if (entrevista.getPersonasHabita() != null) {
                existing.getPersonasHabita().clear();
                entrevista.getPersonasHabita().forEach(p -> { p.setId(null); p.setEntrevista(existing); existing.getPersonasHabita().add(p); });
            }
            if (entrevista.getReferencias() != null) {
                existing.getReferencias().clear();
                entrevista.getReferencias().forEach(r -> { r.setId(null); r.setEntrevista(existing); existing.getReferencias().add(r); });
            }
            if (entrevista.getConsumoSustancias() != null) {
                existing.getConsumoSustancias().clear();
                entrevista.getConsumoSustancias().forEach(c -> { c.setId(null); c.setEntrevista(existing); existing.getConsumoSustancias().add(c); });
            }

            // Actualizar el usuario que realizó la última modificación
            String emailEditor = SecurityContextHolder.getContext().getAuthentication().getName();
            userRepository.findByEmail(emailEditor).ifPresent(existing::setRegistradoPor);

            EntrevistaEncuadre updatedEnt = repository.save(existing);
            bitacoraService.registrar(Bitacora.Entidad.ENTREVISTA, updatedEnt.getId(),
                    updatedEnt.getNombre() + " " + updatedEnt.getApPaterno(),
                    Bitacora.Accion.EDITAR, descCambios);
            return new ApiResponse(true, "Entrevista actualizada", updatedEnt);
        }).orElse(new ApiResponse(false, "Entrevista no encontrada"));
    }

    @Transactional
    public ApiResponse delete(Long id) {
        return repository.findById(id).map(e -> {
            String nombreDel = e.getNombre() + " " + e.getApPaterno();
            bitacoraService.registrar(Bitacora.Entidad.ENTREVISTA, id, nombreDel,
                    Bitacora.Accion.ELIMINAR, "Entrevista eliminada. Folio: " + e.getFolio());
            repository.delete(e);
            return new ApiResponse(true, "Entrevista eliminada");
        }).orElse(new ApiResponse(false, "Entrevista no encontrada"));
    }
}