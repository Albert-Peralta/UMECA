package mx.edu.utez.umeca.modules.security.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserRequestDTO(

        @NotBlank(message = "El nombre es obligatorio")
        String nombre,

        @NotBlank(message = "El apellido paterno es obligatorio")
        String apPaterno,

        String apMaterno,

        @NotBlank(message = "El usuario es obligatorio")
        @Size(min = 4, max = 50, message = "El usuario debe tener entre 4 y 50 caracteres")
        String username,

        // Correo electrónico opcional (comentado hasta que sea requerido)
        // @NotBlank(message = "El correo es obligatorio")
        // @Email(message = "El correo no tiene un formato válido")
        String email,

        // Contraseña solo se usa al crear; en edición se ignora si viene vacía
        String password,

        String cargo,

        String dependencia,

        @NotNull(message = "El rol es obligatorio")
        User.Rol rol,

        @NotNull(message = "La zona es obligatoria")
        User.Zona zona
) {
    /** Convierte el DTO en una entidad User lista para persistirse. */
    public User toEntity() {
        User u = new User();
        u.setNombre(nombre);
        u.setApPaterno(apPaterno);
        u.setApMaterno(apMaterno);
        u.setUsername(username);
        u.setEmail(email);       // puede ser null
        u.setPassword(password); // texto plano; el servicio la encripta
        u.setCargo(cargo);
        u.setDependencia(dependencia);
        u.setRol(rol);
        u.setZona(zona);
        return u;
    }
}
