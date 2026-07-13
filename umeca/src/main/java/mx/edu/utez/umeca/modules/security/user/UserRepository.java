package mx.edu.utez.umeca.modules.security.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByIdentificador(String identificador);

    Optional<User> findByResetToken(String resetToken);

    @Query("SELECT MAX(CAST(SUBSTRING(u.identificador, LENGTH(u.identificador) - 3, 4) AS int)) " +
           "FROM User u WHERE u.zona = :zona AND u.rol = :rol AND u.identificador IS NOT NULL")
    Optional<Integer> findMaxConsecutivoByZonaAndRol(@Param("zona") User.Zona zona,
                                                     @Param("rol") User.Rol rol);
}