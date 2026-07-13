package mx.edu.utez.umeca.modules.entrevista;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;

@Getter
@Setter
@Entity
@Table(name = "consumo_sustancias")
public class ConsumoSustancia extends BaseEntity {

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrevista_id", nullable = false)
    private EntrevistaEncuadre entrevista;

    @Column(length = 100)
    private String sustancia;

    @Column
    private Boolean consume = false;

    @Column(length = 100)
    private String desde;

    @Column(length = 100)
    private String periodicidad;

    @Column(length = 100)
    private String cantidad;

    @Column(name = "ultimo_consumo", length = 100)
    private String ultimoConsumo;
}