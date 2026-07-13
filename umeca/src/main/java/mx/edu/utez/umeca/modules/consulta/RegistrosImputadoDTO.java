package mx.edu.utez.umeca.modules.consulta;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class RegistrosImputadoDTO {

    private boolean encontrado;
    private Long imputadoId;
    private String nombreCompleto;
    private String causaPenal;
    private String delito;

    private List<RegistroItem> entrevistas;
    private List<RegistroItem> evaluaciones;
    private List<RegistroItem> medidas;

    @Getter
    @Setter
    public static class RegistroItem {
        private Long id;
        private String fecha;
        private String fechaLevantamiento; // solo aplica para medidas levantadas
        private String estatus;
        private String detalle;
        private Boolean cumplioLevantamiento; // solo aplica para medidas levantadas
    }
}
