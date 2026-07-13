package mx.edu.utez.umeca.modules.security.mail;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    private String frontendUrl;

    @PostConstruct
    public void detectarUrl() {
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (ni.isLoopback() || !ni.isUp()) continue;
                for (InetAddress addr : Collections.list(ni.getInetAddresses())) {
                    if (addr.isLoopbackAddress() || addr.getHostAddress().contains(":")) continue;
                    frontendUrl = "http://" + addr.getHostAddress() + ":5173";
                    return;
                }
            }
        } catch (Exception ignored) {}
        frontendUrl = "http://localhost:5173";
    }

    @Async
    public void enviarRecuperacion(String destinatario, String nombre, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(destinatario);
            helper.setSubject("Recuperación de contraseña — Sistema UMECA");
            helper.setText(construirHtmlRecuperacion(nombre, token), true);

            mailSender.send(message);
        } catch (Exception e) {
            log.error("❌ Error al enviar correo de recuperación a {}: {}", destinatario, e.getMessage(), e);
        }
    }

    private String construirHtmlRecuperacion(String nombre, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        return """
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background-color: #f4f6f4;">

              <!-- HEADER -->
              <div style="background: linear-gradient(135deg, #2c5234 0%%, #376842 60%%, #4a8a5a 100%%);
                          padding: 36px 24px 28px; text-align: center;">
                <div style="font-size: 22px; font-weight: 800; color: white; letter-spacing: 6px; margin-bottom: 4px;">UMECA</div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.75); letter-spacing: 2.5px; text-transform: uppercase;">
                  Unidad de Medidas Cautelares
                </div>
              </div>

              <!-- CUERPO -->
              <div style="background-color: #ffffff; padding: 36px 32px 28px;">

                <h2 style="margin: 0 0 8px; font-size: 22px; color: #1a3a1a; font-weight: 700;">
                  Recuperación de contraseña 🔐
                </h2>
                <p style="margin: 0 0 24px; font-size: 15px; color: #555; line-height: 1.6;">
                  Hola <strong>%s</strong>, recibimos una solicitud para restablecer tu contraseña.
                  Haz clic en el botón de abajo para crear una nueva. Este enlace es válido por <strong>10 minutos</strong> y solo puede usarse una vez.
                </p>

                <!-- Aviso de seguridad -->
                <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                  <tr>
                    <td style="background: #fff8e1; border-left: 4px solid #f9a825; border-radius: 8px; padding: 14px 16px;">
                      <div style="font-size: 13px; color: #795548; font-weight: 700; margin-bottom: 4px;">¿No solicitaste esto?</div>
                      <div style="font-size: 13px; color: #795548; line-height: 1.5;">
                        Si no solicitaste el cambio, ignora este correo. Tu contraseña actual seguirá funcionando con normalidad.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Botón CTA -->
                <div style="text-align: center; margin-bottom: 20px;">
                  <a href="%s"
                     style="display: inline-block; background: linear-gradient(135deg, #2c5234, #376842);
                            color: white; padding: 14px 40px; border-radius: 10px;
                            text-decoration: none; font-weight: 700; font-size: 15px;
                            letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(55,104,66,0.35);">
                    Restablecer contraseña →
                  </a>
                </div>

                <p style="font-size: 12px; color: #aaa; text-align: center; margin: 0;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                  <span style="color: #376842; word-break: break-all;">%s</span>
                </p>
              </div>

              <!-- FOOTER -->
              <div style="background: linear-gradient(135deg, #2c5234, #376842); padding: 20px 24px; text-align: center;">
                <div style="font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 600; margin-bottom: 4px;">
                  UMECA — Sistema de Gestión Interna
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.55);">
                  Dirección de la Unidad de Medidas Cautelares y Salidas Alternas · Xochitepec, Morelos
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.15);
                            font-size: 11px; color: rgba(255,255,255,0.4);">
                  Este correo fue generado automáticamente, por favor no respondas a este mensaje.
                </div>
              </div>

            </div>
            """.formatted(nombre, resetUrl, resetUrl);
    }

    @Async
    public void enviarCredenciales(String destinatario, String nombre,
                                   String passwordTemporal, String identificador) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(destinatario);
            helper.setCc("notificaciones.umeca@gmail.com");
            helper.setSubject("Bienvenido al Sistema UMECA — Tus credenciales de acceso");
            helper.setText(construirHtml(nombre, destinatario, passwordTemporal, identificador), true);

            mailSender.send(message);
        } catch (Exception e) {
            log.error("❌ Error al enviar correo a {}: {}", destinatario, e.getMessage(), e);
        }
    }

    private String construirHtml(String nombre, String email,
                                 String password, String identificador) {
        return """
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background-color: #f4f6f4;">

              <!-- HEADER -->
              <div style="background: linear-gradient(135deg, #2c5234 0%%, #376842 60%%, #4a8a5a 100%%);
                          padding: 36px 24px 28px; text-align: center; border-radius: 0 0 0 0;">

                <!-- Logo SVG inline -->
                <svg width="72" height="72" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
                     style="display:block; margin: 0 auto 14px;">
                  <circle cx="50" cy="50" r="50" fill="rgba(255,255,255,0.15)"/>
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
                  <path d="M50 12 L74 21 L74 52 Q74 69 50 80 Q26 69 26 52 L26 21 Z"
                        fill="rgba(255,255,255,0.9)"/>
                  <path d="M50 17 L69 25 L69 51 Q69 65 50 75 Q31 65 31 51 L31 25 Z"
                        fill="none" stroke="#376842" stroke-width="1.2" opacity="0.5"/>
                  <rect x="48.5" y="30" width="3" height="30" rx="1.5" fill="#2c5234"/>
                  <rect x="35" y="37" width="30" height="3" rx="1.5" fill="#2c5234"/>
                  <line x1="38" y1="40" x2="32" y2="51" stroke="#2c5234" stroke-width="1.4" stroke-linecap="round"/>
                  <path d="M26 51 Q32 60 38 51 Z" fill="#2c5234" opacity="0.6"/>
                  <ellipse cx="32" cy="51" rx="6" ry="1.5" fill="#2c5234"/>
                  <line x1="62" y1="40" x2="68" y2="51" stroke="#2c5234" stroke-width="1.4" stroke-linecap="round"/>
                  <path d="M62 51 Q68 60 74 51 Z" fill="#2c5234" opacity="0.6"/>
                  <ellipse cx="68" cy="51" rx="6" ry="1.5" fill="#2c5234"/>
                  <rect x="47" y="60" width="6" height="4" rx="1" fill="#2c5234"/>
                  <rect x="41" y="63" width="18" height="3" rx="1.5" fill="#2c5234"/>
                </svg>

                <div style="font-size: 22px; font-weight: 800; color: white; letter-spacing: 6px; margin-bottom: 4px;">UMECA</div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.75); letter-spacing: 2.5px; text-transform: uppercase;">
                  Unidad de Medidas Cautelares
                </div>
              </div>

              <!-- CUERPO -->
              <div style="background-color: #ffffff; padding: 36px 32px 28px;">

                <!-- Saludo -->
                <h2 style="margin: 0 0 8px; font-size: 22px; color: #1a3a1a; font-weight: 700;">
                  ¡Bienvenido/a, %s! 👋
                </h2>
                <p style="margin: 0 0 24px; font-size: 15px; color: #555; line-height: 1.6;">
                  Tu cuenta en el Sistema de Gestión UMECA ha sido creada exitosamente.
                  A continuación encontrarás tus credenciales de acceso. Guárdalas en un lugar seguro.
                </p>

                <!-- Tarjetas de credenciales (tabla para compatibilidad email) -->
                <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">

                  <!-- Identificador -->
                  <tr>
                    <td style="padding-bottom: 10px;">
                      <table width="100%%" cellpadding="0" cellspacing="0"
                             style="background: #eef4ff; border: 1px solid #bfdbfe; border-radius: 10px;">
                        <tr>
                          <td width="56" style="padding: 14px 0 14px 16px; vertical-align: middle;">
                            <table cellpadding="0" cellspacing="0">
                              <tr><td style="width: 36px; height: 36px; background: #1d4ed8; border-radius: 8px; text-align: center; vertical-align: middle; font-size: 18px; line-height: 36px;">
                                🪪
                              </td></tr>
                            </table>
                          </td>
                          <td style="padding: 14px 16px; vertical-align: middle;">
                            <div style="font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Identificador</div>
                            <div style="font-size: 16px; font-weight: 700; color: #1a3a1a; font-family: monospace;">%s</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Correo -->
                  <tr>
                    <td style="padding-bottom: 10px;">
                      <table width="100%%" cellpadding="0" cellspacing="0"
                             style="background: #f0f7f1; border: 1px solid #c8e6c9; border-radius: 10px;">
                        <tr>
                          <td width="56" style="padding: 14px 0 14px 16px; vertical-align: middle;">
                            <table cellpadding="0" cellspacing="0">
                              <tr><td style="width: 36px; height: 36px; background: #376842; border-radius: 8px; text-align: center; vertical-align: middle; font-size: 18px; line-height: 36px;">
                                ✉
                              </td></tr>
                            </table>
                          </td>
                          <td style="padding: 14px 16px; vertical-align: middle;">
                            <div style="font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Correo electrónico</div>
                            <div style="font-size: 15px; font-weight: 600; color: #1a3a1a;">%s</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Contraseña -->
                  <tr>
                    <td>
                      <table width="100%%" cellpadding="0" cellspacing="0"
                             style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px;">
                        <tr>
                          <td width="56" style="padding: 14px 0 14px 16px; vertical-align: middle;">
                            <table cellpadding="0" cellspacing="0">
                              <tr><td style="width: 36px; height: 36px; background: #374151; border-radius: 8px; text-align: center; vertical-align: middle; font-size: 18px; line-height: 36px;">
                                🔒
                              </td></tr>
                            </table>
                          </td>
                          <td style="padding: 14px 16px; vertical-align: middle;">
                            <div style="font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Contraseña temporal</div>
                            <div style="font-size: 17px; font-weight: 700; color: #1a3a1a; font-family: monospace; letter-spacing: 1px;">%s</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>

                <!-- Aviso de seguridad -->
                <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                  <tr>
                    <td style="background: #ffeaea; border-left: 4px solid #e53935; border-radius: 8px; padding: 14px 16px;">
                      <div style="font-size: 13px; color: #c62828; font-weight: 700; margin-bottom: 4px;">Acción requerida al primer ingreso</div>
                      <div style="font-size: 13px; color: #c62828; line-height: 1.5;">
                        Por seguridad del sistema, se te pedirá crear una nueva contraseña la primera vez que inicies sesión.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Pasos rápidos -->
                <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                  <tr>
                    <td style="font-size: 13px; font-weight: 700; color: #376842; padding-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ¿Cómo ingresar?
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width: 24px; height: 24px; background: #376842; color: white; border-radius: 50%%; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; vertical-align: middle;">1</td>
                        <td style="padding-left: 10px; font-size: 13px; color: #555; line-height: 1.5; vertical-align: middle;">Haz clic en el botón <strong>"Ir al sistema"</strong> de abajo.</td>
                      </tr></table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width: 24px; height: 24px; background: #376842; color: white; border-radius: 50%%; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; vertical-align: middle;">2</td>
                        <td style="padding-left: 10px; font-size: 13px; color: #555; line-height: 1.5; vertical-align: middle;">Ingresa tu correo y la contraseña temporal.</td>
                      </tr></table>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="width: 24px; height: 24px; background: #376842; color: white; border-radius: 50%%; font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; vertical-align: middle;">3</td>
                        <td style="padding-left: 10px; font-size: 13px; color: #555; line-height: 1.5; vertical-align: middle;">Crea tu nueva contraseña personal y ¡listo!</td>
                      </tr></table>
                    </td>
                  </tr>
                </table>

                <!-- Botón CTA -->
                <div style="text-align: center; margin-bottom: 20px;">
                  <a href="%s"
                     style="display: inline-block; background: linear-gradient(135deg, #2c5234, #376842);
                            color: white; padding: 14px 40px; border-radius: 10px;
                            text-decoration: none; font-weight: 700; font-size: 15px;
                            letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(55,104,66,0.35);">
                    Ir al sistema →
                  </a>
                </div>

                <p style="font-size: 12px; color: #aaa; text-align: center; margin: 0;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                  <span style="color: #376842; word-break: break-all;">%s</span>
                </p>
              </div>

              <!-- FOOTER -->
              <div style="background: linear-gradient(135deg, #2c5234, #376842); padding: 20px 24px; text-align: center;">
                <div style="font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 600; margin-bottom: 4px;">
                  UMECA — Sistema de Gestión Interna
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.55);">
                  Dirección de la Unidad de Medidas Cautelares y Salidas Alternas · Xochitepec, Morelos
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.15);
                            font-size: 11px; color: rgba(255,255,255,0.4);">
                  Este correo fue generado automáticamente, por favor no respondas a este mensaje.
                  Si tienes dudas, contacta al administrador del sistema.
                </div>
              </div>

            </div>
            """.formatted(nombre, identificador, email, password, frontendUrl, frontendUrl);
    }
}
