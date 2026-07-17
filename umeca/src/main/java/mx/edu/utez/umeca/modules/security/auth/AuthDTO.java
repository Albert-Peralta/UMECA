package mx.edu.utez.umeca.modules.security.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AuthDTO {

    @NotBlank(message = "El usuario es obligatorio")
    private String username;

    @NotBlank(message = "La contraseña es obligatoria")
    private String password;

    // Correo comentado — el login ahora es por usuario/contraseña
    // @NotBlank(message = "El correo es obligatorio")
    // @Email(message = "Formato de correo inválido")
    // private String email;
}
