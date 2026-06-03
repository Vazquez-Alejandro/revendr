import { useState } from 'react'
import { Calendar, Clock, User, Phone, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const services = [
  { id: 1, name: 'Corte de Cabello', duration: 30, price: 3500 },
  { id: 2, name: 'Coloración', duration: 90, price: 8000 },
  { id: 3, name: 'Manicuría', duration: 45, price: 2500 },
  { id: 4, name: 'Depilación', duration: 60, price: 4000 },
  { id: 5, name: 'Masaje Facial', duration: 40, price: 5000 },
]

const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']

export default function DemoBooking() {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [formData, setFormData] = useState({ name: '', phone: '' })
  const [booked, setBooked] = useState(false)

  const businessName = 'Bella Estética'
  const colors = { primary: '#ec4899', secondary: '#be185d' }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const days = getDaysInMonth(currentMonth)

  const handleBook = () => {
    setBooked(true)
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Turno Confirmado!</h1>
          <p className="text-gray-600 mb-6">
            Tu turno para <strong>{selectedService?.name}</strong> el día{' '}
            <strong>{selectedDate?.toLocaleDateString('es-AR')}</strong> a las{' '}
            <strong>{selectedTime}</strong> fue agendado correctamente.
          </p>
          <p className="text-sm text-gray-500">
            Te enviaremos un recordatorio por WhatsApp 24 horas antes.
          </p>
          <div className="mt-8 p-4 bg-pink-50 rounded-xl">
            <p className="text-sm text-pink-800 font-medium">
              ¿Te gustaría este sistema para tu negocio?
            </p>
            <p className="text-xs text-pink-600 mt-1">
              contacted by Revendr
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-pink-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de turnos online</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-pink-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Service */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Elegí un servicio</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service); setStep(2) }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedService?.id === service.id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 bg-white hover:border-pink-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{service.name}</h3>
                      <p className="text-sm text-gray-500">{service.duration} min</p>
                    </div>
                    <span className="text-lg font-bold text-pink-600">
                      ${service.price.toLocaleString('es-AR')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Elegí fecha y hora</h2>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <span className="font-medium text-gray-900">
                  {currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => (
                  <button
                    key={i}
                    disabled={!day || day < new Date()}
                    onClick={() => day && setSelectedDate(day)}
                    className={`py-2 rounded-lg text-sm font-medium ${
                      !day ? '' :
                      day < new Date() ? 'text-gray-300' :
                      selectedDate?.toDateString() === day.toDateString()
                        ? 'bg-pink-600 text-white'
                        : 'text-gray-700 hover:bg-pink-100'
                    }`}
                  >
                    {day?.getDate()}
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-3">
                  Horarios disponibles - {selectedDate.toLocaleDateString('es-AR')}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => { setSelectedTime(time); setStep(3) }}
                      className={`py-2 rounded-lg text-sm font-medium border ${
                        selectedTime === time
                          ? 'bg-pink-600 text-white border-pink-600'
                          : 'border-gray-200 text-gray-700 hover:border-pink-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirmá tu turno</h2>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Servicio</span>
                  <span className="font-medium text-gray-900">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium text-gray-900">{selectedDate?.toLocaleDateString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hora</span>
                  <span className="font-medium text-gray-900">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duración</span>
                  <span className="font-medium text-gray-900">{selectedService?.duration} min</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="text-xl font-bold text-pink-600">${selectedService?.price.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Tu nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <input
                type="tel"
                placeholder="Tu teléfono (WhatsApp)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button
                onClick={handleBook}
                disabled={!formData.name || !formData.phone}
                className="w-full py-3 rounded-xl bg-pink-600 text-white font-medium hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Turno
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
