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
        <h1 className="text-3xl font-bold text-dark-50 mb-8">Términos de Servicio</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-dark-300">
          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">1. Aceptación de Términos</h2>
            <p>
              Al acceder y utilizar Revendr, usted acepta estos términos de servicio. 
              Si no está de acuerdo con alguno de estos términos, no utilice nuestro servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">2. Descripción del Servicio</h2>
            <p>
              Revendr es una plataforma SaaS que proporciona herramientas de automatización 
              de prospección, generación de demos personalizadas, envío de mensajes por 
              WhatsApp y procesamiento de pagos. El servicio se proporciona "tal cual" 
              y "según disponibilidad".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">3. Cuentas de Usuario</h2>
            <p>
              Usted es responsable de mantener la confidencialidad de su cuenta y contraseña. 
              Usted es responsable de todas las actividades que ocurran bajo su cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">4. Uso Aceptable</h2>
            <p>
              Usted acepta no utilizar el servicio para: enviar spam o mensajes no solicitados, 
              violar leyes o regulaciones, dañar o interferir con el servicio, o intentar 
              acceder no autorizado a otros sistemas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">5. Pagos y Facturación</h2>
            <p>
              Los pagos se procesan a través de Stripe. Los precios están sujetos a cambios 
              con previo aviso. Los reembolsos se manejan caso por caso dentro de los 
              primeros 14 días.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">6. Propiedad Intelectual</h2>
            <p>
              Todo el contenido, marca registrada y derechos de propiedad intelectual 
              de Revendr son propiedad de sus respectivos titulares. Usted obtiene 
              una licencia limitada para usar el servicio según estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">7. Limitación de Responsabilidad</h2>
            <p>
              Revendr no será responsable por daños indirectos, incidentales, especiales 
              o consecuentes que resulten del uso o la imposibilidad de usar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">8. Terminación</h2>
            <p>
              Podemos terminar o suspender su acceso al servicio inmediatamente, sin previo 
              aviso, por cualquier razón, incluyendo el incumplimiento de estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">9. Cambios en los Términos</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. 
              Los cambios significativos serán notificados con al menos 30 días de anticipación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">10. Contacto</h2>
            <p>
              Para preguntas sobre estos términos, contáctenos a:{' '}
              <a href="mailto:hola@revendr.app" className="text-brand-400 hover:text-brand-300">
                hola@revendr.app
              </a>
            </p>
          </section>
        </div>

        <p className="text-dark-500 text-sm mt-8">
          Última actualización: Junio 2024
        </p>
      </div>
    </div>
  )
}
