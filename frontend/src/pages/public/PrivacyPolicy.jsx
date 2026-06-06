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
        <h1 className="text-3xl font-bold text-dark-50 mb-8">Política de Privacidad</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-dark-300">
          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">1. Información que Recopilamos</h2>
            <p>
              Recopilamos información que usted nos proporciona directamente al registrarse, 
              como su nombre, correo electrónico y información de pago. También recopilamos 
              datos de negocios procesados a través de nuestra plataforma (leads, campañas, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">2. Uso de la Información</h2>
            <p>
              Utilizamos su información para: proporcionar y mejorar nuestros servicios, 
              procesar transacciones, enviar notificaciones importantes, y comunicarnos 
              con usted sobre actualizaciones y ofertas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">3. Compartir Información</h2>
            <p>
              No vendemos ni compartimos su información personal con terceros, excepto 
              cuando sea necesario para proporcionar nuestros servicios (ej: procesadores 
              de pago como Stripe) o cuando lo requiera la ley.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">4. Seguridad</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger 
              su información contra acceso no autorizado, alteración, divulgación o destrucción.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">5. Sus Derechos</h2>
            <p>
              Usted tiene derecho a acceder, corregir o eliminar su información personal. 
              Para ejercer estos derechos, contactenos a hola@revendr.app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">6. Cookies</h2>
            <p>
              Utilizamos cookies y tecnologías similares para mejorar su experiencia, 
              analizar el uso del sitio y personalizar el contenido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">7. Cambios en esta Política</h2>
            <p>
              Nos reservamos el derecho de actualizar esta política en cualquier momento. 
              Los cambios significativos serán notificados por correo electrónico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-dark-100 mb-3">8. Contacto</h2>
            <p>
              Si tiene preguntas sobre esta política, contáctenos a:{' '}
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
