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
public class MensajeChatService {

    private final MensajeChatRepository repo;
    private final UserRepository userRepo;
    private final ChatUltimaLecturaRepository lecturaRepo;

    public MensajeChatService(MensajeChatRepository repo, UserRepository userRepo,
                              ChatUltimaLecturaRepository lecturaRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.lecturaRepo = lecturaRepo;
    }

    @Transactional(readOnly = true)
    public ApiResponse getAll() {
        List<MensajeChatDTO> lista = repo.findAllByOrderByFechaEnvioAsc()
                .stream().map(MensajeChatDTO::from).toList();
        return new ApiResponse(true, "OK", lista);
    }

    public ApiResponse enviar(String contenido) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User autor = userRepo.findByUsername(username).orElseThrow();

        MensajeChat m = new MensajeChat();
        m.setContenido(contenido);
        m.setAutor(autor);
        m.setFechaEnvio(LocalDateTime.now());
        repo.save(m);

        return new ApiResponse(true, "Mensaje enviado", MensajeChatDTO.from(m));
    }

    @Transactional(readOnly = true)
    public ApiResponse getNoLeidos() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User usuario = userRepo.findByUsername(username).orElseThrow();

        long count = lecturaRepo.findByUsuario(usuario)
                .map(ul -> repo.countByFechaEnvioAfterAndAutorNot(ul.getUltimaLectura(), usuario))
                .orElseGet(() -> repo.countByAutorNot(usuario));

        return new ApiResponse(true, "OK", count);
    }

    public ApiResponse marcarVisto() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User usuario = userRepo.findByUsername(username).orElseThrow();

        ChatUltimaLectura ul = lecturaRepo.findByUsuario(usuario)
                .orElse(new ChatUltimaLectura(usuario, LocalDateTime.now()));
        ul.setUltimaLectura(LocalDateTime.now());
        lecturaRepo.save(ul);

        return new ApiResponse(true, "OK", null);
    }
}
