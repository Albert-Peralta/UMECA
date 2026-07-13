package mx.edu.utez.umeca.modules.security.user;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.bitacora.Bitacora;
import mx.edu.utez.umeca.modules.bitacora.BitacoraService;
import mx.edu.utez.umeca.modules.security.mail.MailService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final BitacoraService bitacoraService;

    // ── UserDetailsService ───────────────────────────────
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));
    }

    // ── Listar todos ─────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse findAll() {
        List<UserResponseDTO> lista = userRepository.findAll().stream()
                .map(UserResponseDTO::from).toList();
        return new ApiResponse(true, "Usuarios obtenidos", lista);
    }

    // ── Buscar por ID ────────────────────────────────────
    @Transactional(readOnly = true)
    public ApiResponse findById(Long id) {
        return userRepository.findById(id)
                .map(u -> new ApiResponse(true, "Usuario encontrado", UserResponseDTO.from(u)))
                .orElse(new ApiResponse(false, "Usuario no encontrado"));
    }

    // ── Registrar usuario ────────────────────────────────
    @Transactional
    public ApiResponse save(User user) {
        if (userRepository.existsByEmail(user.getEmail()))
            return new ApiResponse(false, "El correo ya está registrado");

        // Generar contraseña temporal
        String passwordTemporal = generarPasswordTemporal();

        // Generar identificador único
        String identificador = generarIdentificador(user.getZona(), user.getRol());
        user.setIdentificador(identificador);

        // Configurar primer login
        user.setPrimerLogin(true);
        user.setActivo(true);

        // Guardar con contraseña encriptada
        user.setPassword(passwordEncoder.encode(passwordTemporal));
        User saved = userRepository.save(user);

        // Enviar correo con credenciales (no bloquea si falla el SMTP)
        try {
            mailService.enviarCredenciales(
                    user.getEmail(),
                    user.getNombre() + " " + user.getApPaterno(),
                    passwordTemporal,
                    identificador
            );
        } catch (Exception e) {
            // El correo es informativo; si falla, el usuario ya fue guardado
        }

        bitacoraService.registrar(Bitacora.Entidad.USUARIO, saved.getId(),
                saved.getNombre() + " " + saved.getApPaterno(),
                Bitacora.Accion.CREAR,
                "Usuario creado. Rol: " + saved.getRol() + ". Zona: " + saved.getZona()
                        + ". ID: " + saved.getIdentificador());
        return new ApiResponse(true, "Usuario registrado correctamente", UserResponseDTO.from(saved));
    }

    // ── Actualizar usuario ───────────────────────────────
    @Transactional
    public ApiResponse update(Long id, User user) {
        return userRepository.findById(id).map(existing -> {
            existing.setNombre(user.getNombre());
            existing.setApPaterno(user.getApPaterno());
            existing.setApMaterno(user.getApMaterno());
            existing.setCargo(user.getCargo());
            existing.setDependencia(user.getDependencia());
            existing.setRol(user.getRol());
            existing.setZona(user.getZona());
            User updatedU = userRepository.save(existing);
            bitacoraService.registrar(Bitacora.Entidad.USUARIO, updatedU.getId(),
                    updatedU.getNombre() + " " + updatedU.getApPaterno(),
                    Bitacora.Accion.EDITAR,
                    "Datos actualizados. Rol: " + updatedU.getRol() + ". Zona: " + updatedU.getZona());
            return new ApiResponse(true, "Usuario actualizado", UserResponseDTO.from(updatedU));
        }).orElse(new ApiResponse(false, "Usuario no encontrado"));
    }

    // ── Activar / Desactivar ─────────────────────────────
    @Transactional
    public ApiResponse toggleActivo(Long id) {
        return userRepository.findById(id).map(u -> {
            u.setActivo(!u.isActivo());
            userRepository.save(u);
            String msg = u.isActivo() ? "Usuario activado" : "Usuario desactivado";
            bitacoraService.registrar(Bitacora.Entidad.USUARIO, u.getId(),
                    u.getNombre() + " " + u.getApPaterno(),
                    Bitacora.Accion.CAMBIO_ESTADO, msg);
            return new ApiResponse(true, msg);
        }).orElse(new ApiResponse(false, "Usuario no encontrado"));
    }

    // ── Cambiar contraseña (primer login o autoservicio) ─
    @Transactional
    public ApiResponse cambiarPassword(Long id, String nuevaPassword,
                                       String emailAutenticado, boolean esAdmin) {
        return userRepository.findById(id).map(u -> {
            if (!esAdmin && !u.getEmail().equals(emailAutenticado))
                return new ApiResponse(false, "No tienes permiso para cambiar esta contraseña");
            u.setPassword(passwordEncoder.encode(nuevaPassword));
            u.setPrimerLogin(false);
            userRepository.save(u);
            return new ApiResponse(true, "Contraseña actualizada correctamente");
        }).orElse(new ApiResponse(false, "Usuario no encontrado"));
    }

    // ── Helpers ──────────────────────────────────────────
    private String generarPasswordTemporal() {
        String mayusculas = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String minusculas = "abcdefghijklmnopqrstuvwxyz";
        String numeros = "0123456789";
        String caracteres = "!@#$%&*?";
        String todos = mayusculas + minusculas + numeros + caracteres;

        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder password = new StringBuilder();

        // Al menos uno de cada tipo
        password.append(mayusculas.charAt(random.nextInt(mayusculas.length())));
        password.append(minusculas.charAt(random.nextInt(minusculas.length())));
        password.append(numeros.charAt(random.nextInt(numeros.length())));
        password.append(caracteres.charAt(random.nextInt(caracteres.length())));

        // Completar hasta 10 caracteres
        for (int i = 4; i < 10; i++) {
            password.append(todos.charAt(random.nextInt(todos.length())));
        }

        // Mezclar
        java.util.List<Character> chars = new java.util.ArrayList<>();
        for (char c : password.toString().toCharArray()) chars.add(c);
        java.util.Collections.shuffle(chars, random);

        StringBuilder result = new StringBuilder();
        for (char c : chars) result.append(c);
        return result.toString();
    }

    private String generarIdentificador(User.Zona zona, User.Rol rol) {
        String zonaCode = switch (zona) {
            case XOCHITEPEC -> "XOCH";
            case CUAUTLA -> "CUAL";
            case JOJUTLA -> "JOJ";
        };

        String rolCode = switch (rol) {
            case ADMINISTRADOR -> "ADM";
            case SUPERVISION -> "SUP";
            case EVALUADOR_RIESGO -> "EVA";
        };

        int siguiente = userRepository.findMaxConsecutivoByZonaAndRol(zona, rol)
                .orElse(0) + 1;

        String identificador;
        do {
            identificador = zonaCode + "-" + rolCode + "-" + String.format("%04d", siguiente);
            siguiente++;
        } while (userRepository.existsByIdentificador(identificador));

        return identificador;
    }
}