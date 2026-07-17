package mx.edu.utez.umeca.modules.medidacautelar;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class MedidaCautelarDTO {

    private Long id;
    private Long imputadoId;
    private Long entrevistaId;
    private Long medidaOrigenId;  // id de la MC original cuando se crea un SCP derivado
    private String causaPenal;
    private String tipo;  // MEDIDA_CAUTELAR | SUSPENSION_CONDICIONAL

    // Datos procesales
    private LocalDate fechaRecepcion;
    private String delito;
    private String modalidad;
    private String delitosJson;
    private String sede;
    private String nombreJuez;
    private LocalDate fechaFormulacion;
    private LocalDate fechaVinculacionProceso;
    private LocalDate fechaEntrevistaEvaluacion;

    // MC: Art. 155
    private LocalDate fechaCanalizacion;
    private Boolean aDisposicion;
    private String descripcionDomicilio;
    private String presentacionPeriodica;
    private String noBiometrico;
    private String noLibro;
    private String noPagina;
    private String cumpliendoIncumpliendo;
    private String distritoJudicial;
    private String descripcionInforme;
    private Boolean acuerdoReparatorio;
    private String descripcionAcuerdo;
    private LocalDate fechaCelebracionAcuerdo;
    private LocalDate fechaCumplimientoAcuerdo;
    private String estatusFinal;
    private LocalDate fechaTermino;

    // SCP específico
    private LocalDate fechaImposicionScp;
    private LocalDate plazoScp;
    private String canalizacion;
    private String tipoServicio;
    private LocalDate fechaInformeFinal;
    private LocalDate vencimientoPlazo;
    private String oficioSobreseimiento;
    private String responsableCierre;

    // Fracciones/condiciones
    private List<String> fracciones;
    private String detallesFracciones;

    // Info adicional
    private String advertencia;
    private String observaciones;
    private String responsableSeguimiento;
    private String observacionesGenerales;
    private LocalDate fechaProximaRevision;
    private LocalDate vigenciaInicio;
    private LocalDate vigenciaFin;
    private String estado;
}
