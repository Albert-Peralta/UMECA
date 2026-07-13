package mx.edu.utez.umeca.modules.security.auth;

import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import mx.edu.utez.umeca.modules.security.config.JwtService;
import mx.edu.utez.umeca.modules.security.mail.MailService;
import mx.edu.utez.umeca.modules.security.user.User;
import mx.edu.utez.umeca.modules.security.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public ApiResponse login(AuthDTO dto) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(dto.getEmail(), dto.getPassword())
            );

            User user = userRepository.findByEmail(dto.getEmail())
                    .orElseThrow();

            String token = jwtService.generateToken(user);

            Map<String, Object> data = new HashMap<>();
            data.put("token", token);
            data.put("id", user.getId());
            data.put("nombre", user.getNombre());
            data.put("apPaterno", user.getApPaterno());
            data.put("apMaterno", user.getApMaterno());
            data.put("email", user.getEmail());
            data.put("cargo", user.getCargo());
            data.put("dependencia", user.getDependencia());
            data.put("identificador", user.getIdentificador());
            data.put("rol", user.getRol());
            data.put("zona", user.getZona());
            data.put("primerLogin", user.isPrimerLogin());

            return new ApiResponse(true, "Inicio de sesión exitoso", data);

        } catch (DisabledException e) {
            return new ApiResponse(false, "Tu cuenta está desactivada. Contacta al administrador.");
        } catch (AuthenticationException e) {
            return new ApiResponse(false, "Correo o contraseña incorrectos");
        }
    }

    public boolean verificarPassword(String email, String password) {
        return userRepository.findByEmail(email)
                .map(u -> passwordEncoder.matches(password, u.getPassword()))
                .orElse(false);
    }

    public ApiResponse validarToken(String token) {
        return userRepository.findByResetToken(token)
                .filter(u -> u.getResetTokenExpiry() != null
                          && u.getResetTokenExpiry().isAfter(LocalDateTime.now()))
                .map(u -> new ApiResponse(true, "Token válido"))
                .orElse(new ApiResponse(false, "El enlace no es válido o ha expirado."));
    }

    public ApiResponse solicitarRecuperacion(String email) {
        // Siempre responde igual para no revelar si el correo existe
        userRepository.findByEmail(email).ifPresent(user -> {
            if (!user.isActivo()) return;
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(10));
            userRepository.save(user);
            String nombre = user.getNombre() + " " + user.getApPaterno();
            mailService.enviarRecuperacion(email, nombre, token);
        });
        return new ApiResponse(true, "Si el correo está registrado, recibirás un enlace en breve.");
    }

    public ApiResponse restablecerPassword(String token, String nuevaPassword) {
        User user = userRepository.findByResetToken(token)
                .orElse(null);

        if (user == null || user.getResetTokenExpiry() == null
                || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return new ApiResponse(false, "El enlace no es válido o ha expirado.");
        }

        user.setPassword(passwordEncoder.encode(nuevaPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        user.setPrimerLogin(false); // ya tiene contraseña propia
        userRepository.save(user);

        return new ApiResponse(true, "Contraseña restablecida exitosamente.");
    }
}