package mx.edu.utez.umeca.modules.entrevista;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;

@Getter
@Setter
@Entity
@Table(name = "domicilios_entrevista")
public class DomicilioEntrevista extends BaseEntity {

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrevista_id", nullable = false)
    private EntrevistaEncuadre entrevista;

    @Column(name = "calle_numero", length = 200)
    private String calleNumero;

    @Column(length = 200)
    private String calle;

    @Column(length = 50)
    private String numero;

    @Column(length = 100)
    private String colonia;

    @Column(length = 100)
    private String ciudad;

    @Column(length = 100)
    private String municipio;

    @Column(name = "estado", length = 100)
    private String estado;

    @Column(length = 20)
    private String cp;

    @Column(name = "tipo_domicilio", length = 100)
    private String tipoDomicilio;

    @Column(name = "tipo_domicilio_otro", length = 200)
    private String tipoDomicilioOtro;

    @Column(name = "coordenadas", length = 50)
    private String coordenadas;

    @Column
    private Integer anios;

    @Column(length = 100)
    private String propietario;

    @Column(name = "dias_disponibles", length = 100)
    private String diasDisponibles;

    @Column(name = "hora_disponible", length = 50)
    private String horaDisponible;

    @Column(name = "referencias", columnDefinition = "TEXT")
    private String referencias;

    @Column(length = 100)
    private String razon;

    @Column(name = "numero_domicilio")
    private Integer numeroDomicilio = 1;
}