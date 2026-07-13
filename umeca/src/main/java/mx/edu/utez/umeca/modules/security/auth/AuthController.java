package mx.edu.utez.umeca.modules.security.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mx.edu.utez.umeca.kernel.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse> login(@Valid @RequestBody AuthDTO dto) {
        ApiResponse response = authService.login(dto);
        return response.isOk()
                ? ResponseEntity.ok(response)
                : ResponseEntity.status(401).body(response);
    }

    @GetMapping("/hash")
    public String hash(@RequestParam String password) {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(password);
    }

    @PostMapping("/verificar-password")
    public ResponseEntity<ApiResponse> verificarPassword(@RequestBody java.util.Map<String, String> body,
                                                         org.springframework.security.core.Authentication auth) {
        String password = body.get("password");
        String email = auth.getName();
        boolean valido = authService.verificarPassword(email, password);
        return valido ? ResponseEntity.ok(new ApiResponse(true, "Contraseña válida"))
                : ResponseEntity.status(400).body(new ApiResponse(false, "Contraseña incorrecta"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse> forgotPassword(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        return ResponseEntity.ok(authService.solicitarRecuperacion(email));
    }

    @GetMapping("/validate-reset-token")
    public ResponseEntity<ApiResponse> validateResetToken(@RequestParam String token) {
        ApiResponse res = authService.validarToken(token);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(400).body(res);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse> resetPassword(@RequestBody java.util.Map<String, String> body) {
        String token = body.get("token");
        String password = body.get("password");
        ApiResponse res = authService.restablecerPassword(token, password);
        return res.isOk() ? ResponseEntity.ok(res) : ResponseEntity.status(400).body(res);
    }
}