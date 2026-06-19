const welcomeEmail = (userName, loginUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px;text-align:center;">
              <div style="width:60px;height:60px;margin:0 auto 24px;background:linear-gradient(135deg,#0ea5e9,#0369a1);border-radius:16px;line-height:60px;font-size:28px;">⚡</div>
              <h1 style="color:#f1f5f9;font-size:24px;margin:0 0 16px;">¡Bienvenido a Revendr!</h1>
              <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 32px;">
                Tu cuenta fue creada exitosamente. Ya podés empezar a automatizar tu prospección.
              </p>
              <a href="${loginUrl}" style="display:inline-block;background-color:#0ea5e9;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
                Iniciar Sesión
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#0f172a;border-top:1px solid #334155;">
              <p style="color:#64748b;font-size:12px;margin:0;text-align:center;">
                © 2024 Revendr. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

const bookingConfirmation = (userName, businessName, service, date, time, propuestaUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px;text-align:center;">
              <div style="width:60px;height:60px;margin:0 auto 24px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;line-height:60px;font-size:28px;">✓</div>
              <h1 style="color:#f1f5f9;font-size:24px;margin:0 0 16px;">¡Turno Confirmado!</h1>
              <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 24px;">
                Hola <strong style="color:#f1f5f9;">${userName}</strong>, tu turno fue agendado correctamente.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:12px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Negocio</td>
                        <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600;">${businessName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Servicio</td>
                        <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600;">${service}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Fecha</td>
                        <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600;">${date}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Hora</td>
                        <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600;">${time}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <a href="${propuestaUrl}" style="display:inline-block;background-color:#0ea5e9;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
                Ver mi Propuesta
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#0f172a;border-top:1px solid #334155;">
              <p style="color:#64748b;font-size:12px;margin:0;text-align:center;">
                © 2024 Revendr. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

const paymentConfirmation = (userName, plan, amount) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px;text-align:center;">
              <div style="width:60px;height:60px;margin:0 auto 24px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:50%;line-height:60px;font-size:28px;">💳</div>
              <h1 style="color:#f1f5f9;font-size:24px;margin:0 0 16px;">¡Pago Confirmado!</h1>
              <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 24px;">
                Hola <strong style="color:#f1f5f9;">${userName}</strong>, tu pago fue procesado correctamente.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;border-radius:12px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Plan</td>
                        <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600;text-transform:capitalize;">${plan}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Monto</td>
                        <td style="padding:8px 0;color:#10b981;font-size:14px;text-align:right;font-weight:600;">$${amount}/mes</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
                Ya podés acceder a tu panel y empezar a usar Revendr.
              </p>

              <a href="https://revendr-9add8.web.app/dashboard" style="display:inline-block;background-color:#0ea5e9;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
                Ir al Panel
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#0f172a;border-top:1px solid #334155;">
              <p style="color:#64748b;font-size:12px;margin:0;text-align:center;">
                © 2024 Revendr. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

module.exports = { welcomeEmail, bookingConfirmation, paymentConfirmation }
