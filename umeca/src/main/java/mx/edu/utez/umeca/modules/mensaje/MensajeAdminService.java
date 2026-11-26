package mx.edu.utez.umeca.modules.mensaje;

import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class MensajeAdminService {

    private final MensajeAdminRepository repo;
    private final UserRepository userRepo;

    public MensajeAdminService(MensajeAdminRepository repo, UserRepository userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }

    public ApiResponse enviar(String contenido, String zonaStr) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User admin = userRepo.findByUsername(username).orElseThrow();

        MensajeAdmin m = new MensajeAdmin();
        m.setContenido(contenido);
        m.setEnviadoPor(admin);
        m.setFechaEnvio(LocalDateTime.now());
        m.setActivo(true);

        if (zonaStr != null && !zonaStr.equalsIgnoreCase("GENERAL")) {
            m.setZonaDestino(MensajeAdmin.ZonaDestino.valueOf(zonaStr.toUpperCase()));
        }

        repo.save(m);
        return new ApiResponse(true, "Mensaje enviado", MensajeAdminResponseDTO.from(m));
    }

    @Transactional(readOnly = true)
    public ApiResponse getMensajesNoLeidos() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        User.Zona zona = user.getZona();

        List<MensajeAdmin> noLeidos;
        if (zona == null) {
            noLeidos = repo.findGeneralesNoLeidos(user);
        } else {
            noLeidos = repo.findNoLeidosParaZona(MensajeAdmin.ZonaDestino.valueOf(zona.name()), user);
        }

        List<MensajeAdminResponseDTO> lista = noLeidos.stream().map(MensajeAdminResponseDTO::from).toList();
        return new ApiResponse(true, "OK", lista);
    }

    public ApiResponse marcarLeido(Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        MensajeAdmin m = repo.findById(id).orElse(null);
        if (m == null) return new ApiResponse(false, "No encontrado");
        m.getLectores().add(user);
        repo.save(m);
        return new ApiResponse(true, "Marcado como leído");
    }

    @Transactional(readOnly = true)
    public ApiResponse getHistorial() {
        List<MensajeAdminResponseDTO> lista = repo.findAllByOrderByFechaEnvioDesc()
                .stream().map(MensajeAdminResponseDTO::from).toList();
        return new ApiResponse(true, "OK", lista);
    }

    @Transactional(readOnly = true)
    public ApiResponse getHistorialPersonal() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        User.Zona zona = user.getZona();

        List<MensajeAdmin> lista;
        if (zona == null) {
            lista = repo.findHistorialGenerales();
        } else {
            lista = repo.findHistorialParaZona(MensajeAdmin.ZonaDestino.valueOf(zona.name()));
        }
        return new ApiResponse(true, "OK", lista.stream().map(MensajeAdminResponseDTO::from).toList());
    }

    public ApiResponse desactivar(Long id) {
        MensajeAdmin m = repo.findById(id).orElse(null);
        if (m == null) return new ApiResponse(false, "No encontrado");
        m.setActivo(false);
        repo.save(m);
        return new ApiResponse(true, "Mensaje desactivado");
    }

    public ApiResponse editar(Long id, String contenido) {
        MensajeAdmin m = repo.findById(id).orElse(null);
        if (m == null) return new ApiResponse(false, "No encontrado");
        m.setContenido(contenido);
        repo.save(m);
        return new ApiResponse(true, "Mensaje actualizado", MensajeAdminResponseDTO.from(m));
    }

    public ApiResponse activar(Long id) {
        MensajeAdmin m = repo.findById(id).orElse(null);
        if (m == null) return new ApiResponse(false, "No encontrado");
        m.setActivo(true);
        repo.save(m);
        return new ApiResponse(true, "Mensaje activado");
    }
}
