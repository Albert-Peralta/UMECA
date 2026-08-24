package mx.edu.utez.umeca.modules.moduloextra;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mx.edu.utez.umeca.modules.security.user.User;

@Entity
@Table(name = "usuario_modulos_extra",
       uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "modulo"}))
@Getter @Setter @NoArgsConstructor
public class UsuarioModuloExtra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @Column(nullable = false, length = 50)
    private String modulo;

    @Column(name = "puede_ver", nullable = false)
    private boolean puedeVer = true;

    @Column(name = "puede_crear", nullable = false)
    private boolean puedeCrear = false;

    @Column(name = "puede_editar", nullable = false)
    private boolean puedeEditar = false;
}
