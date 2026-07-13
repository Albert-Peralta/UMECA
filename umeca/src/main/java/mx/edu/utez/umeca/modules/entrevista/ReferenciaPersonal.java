package mx.edu.utez.umeca.modules.entrevista;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;

@Getter
@Setter
@Entity
@Table(name = "referencias_personales")
public class ReferenciaPersonal extends BaseEntity {

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrevista_id", nullable = false)
    private EntrevistaEncuadre entrevista;

    @Column(length = 200)
    private String nombre;

    @Column(length = 100)
    private String parentesco;

    @Column
    private Integer edad;

    @Column(length = 20)
    private String telefono;

    @Column(length = 300)
    private String direccion;
}