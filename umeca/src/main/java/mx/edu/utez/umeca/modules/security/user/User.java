package mx.edu.utez.umeca.modules.security.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import mx.edu.utez.umeca.kernel.BaseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "usuarios")
public class User extends BaseEntity implements UserDetails {

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "ap_paterno", nullable = false, length = 100)
    private String apPaterno;

    @Column(name = "ap_materno", length = 100)
    private String apMaterno;

    @Column(length = 150)
    private String cargo;

    @Column(length = 150)
    private String dependencia;

    // Usuario para login (reemplaza al correo como credencial de acceso)
    @Column(unique = true, length = 60)
    private String username;

    // Correo electrónico (opcional, se conserva por si se requiere en el futuro)
    // @Column(nullable = false, unique = true, length = 150)
    @Column(length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Rol rol;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Zona zona;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "primer_login", nullable = false)
    private boolean primerLogin = true;

    @Column(name = "identificador", unique = true, length = 20)
    private String identificador;

    @Column(name = "reset_token", length = 100)
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    public enum Rol {
        SUPERVISION, EVALUADOR_RIESGO, ADMINISTRADOR
    }

    public enum Zona {
        XOCHITEPEC, CUAUTLA, JOJUTLA
    }

    // ── UserDetails ──────────────────────────────────────
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return activo; }
}