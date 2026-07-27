package mx.edu.utez.umeca.modules.expediente;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;

/**
 * Registro de cada importación masiva realizada.
 * Permite identificar y revertir una importación específica.
 */
@Getter
@Setter
@Entity
@Table(name = "importaciones_lote")
public class ImportacionLote extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "zona", length = 20)
    private ExpedienteAnterior.Zona zona;

    @Column(name = "importado_por", length = 200)
    private String importadoPor;

    @Column(name = "total_mc")
    private int totalMc;

    @Column(name = "total_scp")
    private int totalScp;

    @Column(name = "total_historico")
    private int totalHistorico;

    @Column(name = "total_omitidos")
    private int totalOmitidos;

    /** Nombre del archivo original subido */
    @Column(name = "nombre_archivo", length = 300)
    private String nombreArchivo;
}
