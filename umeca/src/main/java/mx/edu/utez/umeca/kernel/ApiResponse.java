package mx.edu.utez.umeca.kernel;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * Envoltorio estándar para todas las respuestas de la API.
 * Todos los controllers devuelven {@code ResponseEntity<ApiResponse>}.
 *
 * <pre>
 * { "ok": true, "message": "...", "data": { ... } }
 * </pre>
 */
@Getter
@Setter
@AllArgsConstructor
public class ApiResponse {
    /** Indica si la operación fue exitosa. */
    private boolean ok;
    /** Mensaje descriptivo del resultado (visible en logs y en el frontend). */
    private String message;
    /** Payload de la respuesta; puede ser un objeto, lista o null. */
    private Object data;

    /** Constructor de conveniencia cuando no hay datos que devolver. */
    public ApiResponse(boolean ok, String message) {
        this.ok = ok;
        this.message = message;
        this.data = null;
    }
}