import { Link } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-dark-950">
      <nav className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-dark-50">Revendr</span>
          </Link>
          <Link to="/" className="text-dark-400 hover:text-dark-200 flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-dark-50 mb-2">Política de Privacidad</h1>
        <p className="text-dark-500 text-sm mb-8">Última actualización: 10 de Junio de 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-dark-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">1. Responsable del Tratamiento</h2>
            <p>
              Revendr ("nosotros", "nuestro", "el Responsable") es responsable del tratamiento de sus datos personales. Para consultas sobre privacidad, contactar a: <a href="mailto:hola@revendr.app" className="text-brand-400 hover:text-brand-300">hola@revendr.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">2. Datos que Recopilamos</h2>
            <p className="font-medium text-dark-200">2.1 Datos de Registro:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Nombre y apellido</li>
              <li>Correo electrónico</li>
              <li>Nombre de empresa (opcional)</li>
              <li>Contraseña (encriptada con bcrypt)</li>
              <li>Información de pago (procesada por Stripe, no almacenada en nuestros servidores)</li>
            </ul>

            <p className="font-medium text-dark-200 mt-4">2.2 Datos de Uso:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Campañas creadas y configuración</li>
              <li>Leads procesados y su información pública (nombre, dirección, teléfono, email, reseñas, rating)</li>
              <li>Mensajes enviados y su estado (enviado, leído, clickeado)</li>
              <li>Interacciones con landing pages (vistas, clics, tiempo en página)</li>
              <li>Actividad en el panel (páginas visitadas, acciones realizadas)</li>
            </ul>

            <p className="font-medium text-dark-200 mt-4">2.3 Datos de Leads (Recopilados through Scraping):</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Nombre del negocio</li>
              <li>Dirección y ubicación</li>
              <li>Número de teléfono</li>
              <li>Correo electrónico (si está disponible públicamente)</li>
              <li>Reseñas y calificaciones públicas</li>
              <li>Horarios de atención</li>
              <li>Sitio web</li>
            </ul>
            <p className="mt-2 text-sm text-dark-400">
              Nota: Los datos de leads provienen exclusivamente de fuentes públicas (Google Maps) y se recopilan bajo las excepciones legales de acceso a datos públicos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">3. Finalidad del Tratamiento</h2>
            <p>Utilizamos sus datos para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Proporcionar, mantener y mejorar el Servicio</li>
              <li>Procesar transacciones y gestionar su suscripción</li>
              <li>Enviar notificaciones de cuenta (verificación, cambios, facturación)</li>
              <li>Enviar comunicaciones de marketing (solo si aceptó)</li>
              <li>Generar analytics y reportes agregados</li>
              <li>Detectar y prevenir fraudes o uso indebido</li>
              <li>Cumplir obligaciones legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">4. Base Legal del Tratamiento</h2>
            <p>Tratamos sus datos bajo las siguientes bases legales (Art. 6 RGPD, Art. 5 Ley 25.326):</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Ejecución de contrato:</strong> Para proporcionar el Servicio contratado</li>
              <li><strong>Consentimiento:</strong> Para marketing y comunicaciones opcionales</li>
              <li><strong>Interés legítimo:</strong> Para mejorar el Servicio y prevenir fraudes</li>
              <li><strong>Obligación legal:</strong> Para cumplir con regulaciones aplicables</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">5. Compartir Datos con Terceros</h2>
            <p>No vendemos ni compartimos sus datos personales con terceros, excepto:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Firebase (Google):</strong> Hosting, base de datos, autenticación, funciones serverless</li>
              <li><strong>Stripe:</strong> Procesamiento de pagos (datos de tarjeta no almacenados por nosotros)</li>
              <li><strong>Mercado Pago:</strong> Procesamiento de pagos en Argentina</li>
              <li><strong>Apify:</strong> Servicio de scraping de datos públicos</li>
              <li><strong>Resend:</strong> Envío de emails transaccionales</li>
              <li><strong>Meta (WhatsApp):</strong> Envío de mensajes a través de WhatsApp Business API</li>
            </ul>
            <p className="mt-2">
              Todos los proveedores están bajo acuerdos de confidencialidad y procesamiento de datos conforme a la ley.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">6. Cookies y Tecnologías de Rastreo</h2>
            <p>Utilizamos:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Cookies esenciales:</strong> Para autenticación y sesiones (Firebase Auth)</li>
              <li><strong>Local Storage:</strong> Para preferencias de idioma y tema</li>
              <li><strong>No usamos cookies de terceros para tracking publicitario</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">7. Retención de Datos</h2>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Datos de cuenta:</strong> Mientras la cuenta esté activa + 30 días tras eliminación</li>
              <li><strong>Datos de campañas:</strong> Hasta que el Usuario las elimine o cancele la suscripción</li>
              <li><strong>Datos de leads:</strong> Hasta que el Usuario los elimine o cancele la suscripción</li>
              <li><strong>Logs de actividad:</strong> 12 meses</li>
              <li><strong>Datos de facturación:</strong> Según requisitos legales (10 años en Argentina)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">8. Sus Derechos (Ley 25.326 y RGPD)</h2>
            <p>Usted tiene derecho a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Acceso:</strong> Solicitar una copia de todos sus datos personales</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
              <li><strong>Eliminación:</strong> Solicitar la eliminación de sus datos ("derecho al olvido")</li>
              <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado</li>
              <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos</li>
              <li><strong>Limitación:</strong> Solicitar la limitación del tratamiento</li>
              <li><strong>Revocación:</strong> Retirar el consentimiento en cualquier momento</li>
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos, contactar a <a href="mailto:hola@revendr.app" className="text-brand-400 hover:text-brand-300">hola@revendr.app</a>. Responderemos en un plazo máximo de 30 días.
            </p>
            <p className="mt-2">
              Si considera que sus derechos no fueron respetados, puede presentar una queja ante la Autoridad de Protección de Datos Personales de Argentina: <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">AAIP</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">9. Seguridad de los Datos</h2>
            <p>Implementamos medidas de seguridad técnicas y organizativas:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Encriptación TLS 1.3 en tránsito</li>
              <li>Encriptación AES-256 en reposo</li>
              <li>Autenticación multifactor (disponible)</li>
              <li>Control de acceso basado en roles</li>
              <li>Logs de auditoría</li>
              <li>Copias de seguridad automáticas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">10. Transferencias Internacionales</h2>
            <p>
              Sus datos pueden ser procesados en servidores ubicados en Estados Unidos (Firebase/Google Cloud). Al utilizar el Servicio, usted acepta dicha transferencia. Nos aseguramos de que dichas transferencias cumplan con las leyes de protección de datos aplicables mediante cláusulas contractuales estándar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">11. Menores de Edad</h2>
            <p>
              El Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente datos de menores. Si descubrimos que recopilamos datos de un menor, procederemos a eliminarlos de inmediato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">12. Cambios en esta Política</h2>
            <p>
              Nos reservamos el derecho de actualizar esta política. Los cambios significativos serán notificados por email o a través del Servicio con al menos 30 días de anticipación. El uso continuado del Servicio después de los cambios constituye la aceptación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">13. Contacto</h2>
            <p>
              Para consultas sobre privacidad: <a href="mailto:hola@revendr.app" className="text-brand-400 hover:text-brand-300">hola@revendr.app</a>
            </p>
            <p className="mt-2">
              Responsable de Datos: Revendr<br />
              Buenos Aires, Argentina
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
