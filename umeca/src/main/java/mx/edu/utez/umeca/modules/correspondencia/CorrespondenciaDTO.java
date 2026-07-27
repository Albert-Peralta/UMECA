package mx.edu.utez.umeca.modules.correspondencia;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CorrespondenciaDTO {
    private String sede;
    private String noOficio;
    private String fechaOficio;
    private String fechaRecibido;
    private String tipo;
    private String remitente;
    private String asunto;
    private Integer terminoRespuestaHoras;
    private Boolean requiereRespuesta;
    private String prioridad;
    // archivoPdf se maneja por MultipartFile separado
}
