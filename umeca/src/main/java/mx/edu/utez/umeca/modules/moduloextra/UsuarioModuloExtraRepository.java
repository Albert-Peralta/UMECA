package mx.edu.utez.umeca.modules.moduloextra;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioModuloExtraRepository extends JpaRepository<UsuarioModuloExtra, Long> {

    List<UsuarioModuloExtra> findByUsuarioId(Long usuarioId);

    Optional<UsuarioModuloExtra> findByUsuarioIdAndModulo(Long usuarioId, String modulo);

    void deleteByUsuarioIdAndModulo(Long usuarioId, String modulo);

    void deleteByUsuarioId(Long usuarioId);
}
