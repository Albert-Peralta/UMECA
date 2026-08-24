package mx.edu.utez.umeca.modules.moduloextra;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Bean usado en @PreAuthorize para verificar si el usuario autenticado
 * tiene un módulo extra con el permiso requerido.
 *
 * Uso:  @PreAuthorize("hasAnyAuthority('ROLE_X') or @moduloChecker.puedeVer(authentication,'MODULO')")
 */
@Component("moduloChecker")
@RequiredArgsConstructor
public class ModuloChecker {

    private final UsuarioModuloExtraRepository repo;

    /** Recupera el ID del usuario desde el principal (User implementa UserDetails) */
    private Long userId(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof mx.edu.utez.umeca.modules.security.user.User u) {
            return u.getId();
        }
        return null;
    }

    public boolean puedeVer(Authentication auth, String modulo) {
        Long uid = userId(auth);
        if (uid == null) return false;
        return repo.findByUsuarioIdAndModulo(uid, modulo)
                   .map(UsuarioModuloExtra::isPuedeVer)
                   .orElse(false);
    }

    public boolean puedeCrear(Authentication auth, String modulo) {
        Long uid = userId(auth);
        if (uid == null) return false;
        return repo.findByUsuarioIdAndModulo(uid, modulo)
                   .map(UsuarioModuloExtra::isPuedeCrear)
                   .orElse(false);
    }

    public boolean puedeEditar(Authentication auth, String modulo) {
        Long uid = userId(auth);
        if (uid == null) return false;
        return repo.findByUsuarioIdAndModulo(uid, modulo)
                   .map(UsuarioModuloExtra::isPuedeEditar)
                   .orElse(false);
    }
}
