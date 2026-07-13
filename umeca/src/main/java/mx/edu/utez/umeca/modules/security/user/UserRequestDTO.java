package mx.edu.utez.umeca.modules.security.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UserRequestDTO(

        @NotBlank(message = "El nombre es obligatorio")
        String nombre,

        @NotBlank(message = "El apellido paterno es obligatorio")
        String apPaterno,

        String apMaterno,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato válido")
        String email,

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
        u.setEmail(email);
        u.setCargo(cargo);
        u.setDependencia(dependencia);
        u.setRol(rol);
        u.setZona(zona);
        return u;
    }
}
