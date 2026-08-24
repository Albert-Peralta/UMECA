package mx.edu.utez.umeca.modules.moduloextra;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UsuarioModuloExtraDTO {
    private String modulo;
    private boolean puedeVer   = true;
    private boolean puedeCrear = false;
    private boolean puedeEditar = false;

    public static UsuarioModuloExtraDTO from(UsuarioModuloExtra e) {
        UsuarioModuloExtraDTO dto = new UsuarioModuloExtraDTO();
        dto.setModulo(e.getModulo());
        dto.setPuedeVer(e.isPuedeVer());
        dto.setPuedeCrear(e.isPuedeCrear());
        dto.setPuedeEditar(e.isPuedeEditar());
        return dto;
    }
}
