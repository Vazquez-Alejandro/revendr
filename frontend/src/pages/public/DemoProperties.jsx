import { useState } from 'react'
import { Bed, Bath, Maximize, MapPin, Phone, Mail, ChevronLeft, ChevronRight, Heart } from 'lucide-react'

const properties = [
  {
    id: 1,
    title: 'Departamento 3 ambientes en Palermo',
    price: 180000,
    address: 'Av. Santa Fe 1234, Palermo, CABA',
    bedrooms: 3,
    bathrooms: 2,
    area: 85,
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    description: 'Departamento luminoso con amplio balcón. A metros del subte y plazas.',
  },
  {
    id: 2,
    title: 'Casa con jardín en San Isidro',
    price: 450000,
    address: 'San Martín 567, San Isidro, Buenos Aires',
    bedrooms: 4,
    bathrooms: 3,
    area: 220,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
    description: 'Casa familiar con pileta y parrilla. Jardín amplio con cesped natural.',
  },
  {
    id: 3,
    title: 'Loft moderno en Puerto Madero',
    price: 320000,
    address: 'Alicia Moreau de Justo 890, Puerto Madero',
    bedrooms: 2,
    bathrooms: 1,
    area: 65,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    description: 'Loft con vista al río. Diseño contemporáneo, totalmente amueblado.',
  },
]

export default function DemoProperties() {
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [currentImage, setCurrentImage] = useState(0)
  const [liked, setLiked] = useState([])

  const businessName = 'Inmoxil Propiedades'

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const toggleLike = (id) => {
    setLiked(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{businessName}</h1>
            <p className="text-sm text-gray-500">Las mejores propiedades seleccionadas para vos</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-pink-500 transition-colors">
              <Heart className="w-5 h-5" />
              {liked.length > 0 && (
                <span className="absolute -mt-2 -ml-1 bg-pink-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {liked.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {selectedProperty ? (
          /* Property Detail */
          <div>
            <button 
              onClick={() => setSelectedProperty(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
              <ChevronLeft className="w-5 h-5" />
              Volver a propiedades
            </button>

            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="relative">
                <img 
                  src={selectedProperty.image} 
                  alt={selectedProperty.title}
                  className="w-full h-96 object-cover"
                />
                <button
                  onClick={() => toggleLike(selectedProperty.id)}
                  className="absolute top-4 right-4 p-3 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
                >
                  <Heart 
                    className={`w-6 h-6 ${liked.includes(selectedProperty.id) ? 'fill-pink-500 text-pink-500' : 'text-gray-400'}`} 
                  />
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedProperty.title}</h2>
                    <div className="flex items-center gap-2 text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" />
                      {selectedProperty.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-600">
                      {formatPrice(selectedProperty.price)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 py-4 border-y border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Bed className="w-5 h-5" />
                    <span>{selectedProperty.bedrooms} Dormitorios</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Bath className="w-5 h-5" />
                    <span>{selectedProperty.bathrooms} Baños</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Maximize className="w-5 h-5" />
                    <span>{selectedProperty.area}m²</span>
                  </div>
                </div>

                <p className="text-gray-600 mt-4">{selectedProperty.description}</p>

                <div className="flex gap-3 mt-6">
                  <a 
                    href="https://wa.me/5491112345678" 
                    target="_blank"
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium text-center hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    Consultar por WhatsApp
                  </a>
                  <button className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                    <Mail className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Property Grid */
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Propiedades Destacadas</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <div 
                  key={property.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedProperty(property)}
                >
                  <div className="relative">
                    <img 
                      src={property.image} 
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(property.id) }}
                      className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow hover:bg-white transition-colors"
                    >
                      <Heart 
                        className={`w-4 h-4 ${liked.includes(property.id) ? 'fill-pink-500 text-pink-500' : 'text-gray-400'}`} 
                      />
                    </button>
                    <div className="absolute bottom-3 left-3 bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold">
                      {formatPrice(property.price)}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{property.title}</h3>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                      <MapPin className="w-3 h-3" />
                      {property.address}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> {property.bedrooms}</span>
                      <span className="flex items-center gap-1"><Bath className="w-4 h-4" /> {property.bathrooms}</span>
                      <span className="flex items-center gap-1"><Maximize className="w-4 h-4" /> {property.area}m²</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">¿Tenés propiedades para vender?</p>
            <p className="font-medium text-gray-900">Sistema de gestión inmobiliaria</p>
          </div>
          <a 
            href="#"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Quiero esto
          </a>
        </div>
      </div>
    </div>
  )
}
