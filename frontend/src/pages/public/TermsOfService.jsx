import { Link } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
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
        <h1 className="text-3xl font-bold text-dark-50 mb-2">Términos y Condiciones de Servicio</h1>
        <p className="text-dark-500 text-sm mb-8">Última actualización: 10 de Junio de 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-dark-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al acceder, registrarse o utilizar la plataforma Revendr ("Servicio"), usted ("Usuario") acepta y se compromete a cumplir con estos Términos y Condiciones ("Términos"). Si no está de acuerdo con alguno de estos términos, no debe utilizar el Servicio. El uso continuado del Servicio constituye la aceptación de estos Términos.
            </p>
            <p className="mt-2">
              Revendr se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados a través del Servicio o por email con al menos 30 días de anticipación. El uso del Servicio después de dichos cambios constituye la aceptación de los nuevos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">2. Descripción del Servicio</h2>
            <p>
              Revendr es una plataforma SaaS (Software como Servicio) que proporciona herramientas de automatización de prospección comercial, incluyendo pero no limitado a:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Scraping y recopilación de datos públicos de negocios</li>
              <li>Generación de landing pages y demos personalizadas</li>
              <li>Envío de mensajes automatizados por WhatsApp y email</li>
              <li>Sistema de seguimiento y nurturing de leads</li>
              <li>Procesamiento de pagos integrado</li>
              <li>Analytics y reportes</li>
            </ul>
            <p className="mt-2">
              El Servicio se proporciona "tal cual" y "según disponibilidad". Revendr no garantiza la disponibilidad ininterrumpida del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">3. Elegibilidad y Registro</h2>
            <p>
              Para utilizar el Servicio, usted debe:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Ser mayor de 18 años o la edad legal de consentimiento en su jurisdicción</li>
              <li>Tener capacidad legal para celebrar contratos</li>
              <li>Proporcionar información de registro verdadera, precisa y completa</li>
              <li>Mantener y actualizar su información de registro</li>
              <li>Ser responsable de mantener la confidencialidad de su cuenta y contraseña</li>
              <li>Ser responsable de todas las actividades que ocurran bajo su cuenta</li>
            </ul>
            <p className="mt-2">
              Revendr se reserva el derecho de rechazar o cancelar cuentas a su discreción.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">4. Uso Aceptable</h2>
            <p>El Usuario acepta utilizar el Servicio de manera lícita y ética. Queda estrictamente prohibido:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Enviar spam, mensajes masivos no solicitados o contenido engañoso</li>
              <li>Violar leyes locales, nacionales o internacionales aplicables</li>
              <li>Violar la Ley de Protección de Datos Personales (Ley 25.326 de Argentina) o regulaciones equivalentes</li>
              <li>Usar el Servicio para phishing, fraude o actividades ilegales</li>
              <li>Interferir con el funcionamiento del Servicio o sus servidores</li>
              <li>Intentar acceder no autorizado a otras cuentas o sistemas</li>
              <li>Recopilar datos de otros usuarios sin su consentimiento</li>
              <li>Usar el Servicio para enviar contenido que sea difamatorio, obsceno o amenazante</li>
              <li>Realizar ingeniería inversa o intentar extraer el código fuente del Servicio</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">5. Datos Personales y Privacidad</h2>
            <p>
              El tratamiento de datos personales se rige por nuestra <Link to="/privacy" className="text-brand-400 hover:text-brand-300 underline">Política de Privacidad</Link>, que forma parte integral de estos Términos. Al utilizar el Servicio, usted acepta el tratamiento de datos descrito en dicha política.
            </p>
            <p className="mt-2">
              En cumplimiento de la Ley 25.326 de Protección de Datos Personales (Argentina), el RGPD (Unión Europea) y otras leyes aplicables de protección de datos:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Solo recopilamos datos necesarios para el funcionamiento del Servicio</li>
              <li>Los datos se almacenan de forma segura y se encriptan en tránsito y en reposo</li>
              <li>No vendemos datos personales a terceros</li>
              <li>El Usuario puede solicitar acceso, rectificación o eliminación de sus datos</li>
              <li>Los leads recopilados through scraping provienen de fuentes públicas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">6. Scraping y Recopilación de Datos Públicos</h2>
            <p>
              El Servicio utiliza scraping para recopilar información pública de negocios (nombre, dirección, teléfono, reseñas) de fuentes como Google Maps. Esta información es de acceso público.
            </p>
            <p className="mt-2">El Usuario es responsable de:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Usar los datos recopilados de manera conforme a la ley</li>
              <li>Respetar las preferencias de comunicación de los contactos</li>
              <li>Cumplir con la normativa de protección de datos aplicable</li>
              <li>No usar los datos para fines distintos a los declarados al registrarse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">7. Uso de WhatsApp</h2>
            <p>
              El Servicio permite el envío de mensajes a través de la API de WhatsApp Business. El Usuario acepta:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Cumplir con las <a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">Políticas de WhatsApp Business</a></li>
              <li>No enviar mensajes masivos no solicitados</li>
              <li>Incluir opciones de opt-out en cada mensaje</li>
              <li>No usar el servicio para spam o messaging fraudulento</li>
              <li>Que WhatsApp puede limitar o suspender cuentas que violen sus políticas</li>
            </ul>
            <p className="mt-2">
              Revendr no es responsable de la suspensión o限制 de cuentas de WhatsApp debidas al uso indebido por parte del Usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">8. Planes, Pagos y Facturación</h2>
            <p>
              Los planes de suscripción y sus precios están detallados en la página de Pricing. Al contratar un plan:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>El pago se procesa a través de Stripe o Mercado Pago</li>
              <li>La suscripción se renueva automáticamente al final de cada período</li>
              <li>El Usuario puede cancelar en cualquier momento desde su panel</li>
              <li>Los precios están sujetos a cambios con 30 días de anticipación</li>
              <li>Los montos se facturan en USD o ARS según la moneda seleccionada</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">9. Política de Reembolsos</h2>
            <p>
              Revendr ofrece un período de prueba gratuito de 14 días para nuevos usuarios. Después del período de prueba:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Reembolsos completos se otorgan dentro de los primeros 14 días de pago</li>
              <li>Después de 14 días, no se ofrecen reembolsos por meses parciales</li>
              <li>Los reembolsos se procesan en un plazo de 5-10 días hábiles</li>
              <li>El Usuario debe solicitar el reembolso por email a hola@revendr.app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">10. Propiedad Intelectual</h2>
            <p>
              Todo el contenido, marcas registradas, diseños, código fuente y propiedad intelectual del Servicio son propiedad de Revendr o sus licenciantes. El Usuario obtiene una licencia limitada, no exclusiva, intransferible y revocable para usar el Servicio según estos Términos.
            </p>
            <p className="mt-2">
              El Usuario no puede copiar, modificar, distribuir, vender o arrendar ninguna parte del Servicio o su contenido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">11. Limitación de Responsabilidad</h2>
            <p>
              EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, REVENDR NO SERÁ RESPONSABLE POR:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Daños indirectos, incidentales, especiales, consecuentes o punitivos</li>
              <li>Pérdida de beneficios, datos, uso o goodwill</li>
              <li>Interrupciones del negocio o pérdida de oportunidades</li>
              <li>Errores, omisiones o inexactitudes en el contenido</li>
              <li>Acciones o omisiones de terceros, incluyendo proveedores de servicios</li>
              <li>Resultados de campañas de marketing realizadas por el Usuario</li>
            </ul>
            <p className="mt-2">
              La responsabilidad total de Revendr no excederá el monto pagado por el Usuario en los 12 meses anteriores al evento que dio lugar a la reclamación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">12. Indemnización</h2>
            <p>
              El Usuario acepta indemnizar y mantener indemne a Revendr, sus directores, empleados y agentes de cualquier reclamación, daño, pérdida o gasto (incluyendo honorarios legales) que surja del uso del Servicio, la violación de estos Términos, o la violación de derechos de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">13. Disponibilidad del Servicio</h2>
            <p>
              Revendr se esfuerza por mantener el Servicio disponible 24/7, pero no garantiza disponibilidad ininterrumpida. Podemos realizar mantenimiento programado con aviso previo. No seremos responsables por interrupciones, errores o pérdida de datos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">14. Terminación</h2>
            <p>
              Cualquiera de las partes puede terminar este acuerdo:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>El Usuario puede cancelar su suscripción en cualquier momento desde su panel</li>
              <li>Revendr puede suspender o terminar cuentas que violen estos Términos</li>
              <li>Revendr puede discontinuar el Servicio con 90 días de anticipación</li>
              <li>Tras la terminación, los datos del Usuario serán eliminados después de 30 días</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">15. Ley Aplicable y Jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de la República Argentina. Cualquier disputa será resuelta por los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero que pudiera corresponder.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">16. Contacto</h2>
            <p>
              Para preguntas sobre estos Términos, contáctenos a:{' '}
              <a href="mailto:hola@revendr.app" className="text-brand-400 hover:text-brand-300">
                hola@revendr.app
              </a>
            </p>
            <p className="mt-2">
              Responsable de Datos: Revendr<br />
              Dirección: Buenos Aires, Argentina
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
