package mx.edu.utez.umeca.modules.security.user;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class UserResponseDTO {

    private Long id;
    private String nombre;
    private String apPaterno;
    private String apMaterno;
    private String username;
    private String cargo;
    private String dependencia;
    private String email;
    private User.Rol rol;
    private User.Zona zona;
    private boolean activo;
    private boolean primerLogin;
    private String identificador;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static UserResponseDTO from(User u) {
        UserResponseDTO dto = new UserResponseDTO();
        dto.setId(u.getId());
        dto.setNombre(u.getNombre());
        dto.setApPaterno(u.getApPaterno());
        dto.setApMaterno(u.getApMaterno());
        dto.setUsername(u.getUsername());
        dto.setCargo(u.getCargo());
        dto.setDependencia(u.getDependencia());
        dto.setEmail(u.getEmail());
        dto.setRol(u.getRol());
        dto.setZona(u.getZona());
        dto.setActivo(u.isActivo());
        dto.setPrimerLogin(u.isPrimerLogin());
        dto.setIdentificador(u.getIdentificador());
        dto.setCreatedAt(u.getCreatedAt());
        dto.setUpdatedAt(u.getUpdatedAt());
        return dto;
    }
}
