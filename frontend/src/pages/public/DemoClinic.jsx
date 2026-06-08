import { useState } from 'react'
import { Calendar, Clock, User, Phone, CheckCircle, Stethoscope, Star } from 'lucide-react'

const specialties = [
  { id: 1, name: 'Medicina General', icon: '🩺' },
  { id: 2, name: 'Pediatría', icon: '👶' },
  { id: 3, name: 'Cardiología', icon: '❤️' },
  { id: 4, name: 'Dermatología', icon: '🧴' },
]

const doctors = [
  { id: 1, name: 'Dr. Carlos Méndez', specialty: 'Medicina General', rating: 4.9, image: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 2, name: 'Dra. Ana López', specialty: 'Pediatría', rating: 4.8, image: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 3, name: 'Dr. Roberto García', specialty: 'Cardiología', rating: 4.7, image: 'https://randomuser.me/api/portraits/men/75.jpg' },
  { id: 4, name: 'Dra. Marta Ruiz', specialty: 'Dermatología', rating: 4.9, image: 'https://randomuser.me/api/portraits/women/68.jpg' },
]

const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']

export default function DemoClinic() {
  const [step, setStep] = useState(1)
  const [selectedSpecialty, setSelectedSpecialty] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [formData, setFormData] = useState({ name: '', phone: '', reason: '' })
  const [booked, setBooked] = useState(false)

  const businessName = 'Clínica Médica San Rafael'

  if (booked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Turno Confirmado!</h1>
          <p className="text-gray-600 mb-6">
            Tu turno con <strong>{selectedDoctor?.name}</strong> el día{' '}
            <strong>{selectedDate?.toLocaleDateString('es-AR')}</strong> a las{' '}
            <strong>{selectedTime}</strong> fue agendado.
          </p>
          <div className="bg-emerald-50 rounded-xl p-4 text-left">
            <p className="text-sm text-emerald-800 font-medium mb-2">Recordatorios:</p>
            <ul className="text-sm text-emerald-700 space-y-1">
              <li>• Traé tu documento de identidad</li>
              <li>• Traé tu carnet de obra social (si aplica)</li>
              <li>• Llegá 10 minutos antes del turno</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-emerald-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{businessName}</h1>
              <p className="text-sm text-gray-500">Turnos online</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              {s < 4 && <div className={`w-8 h-0.5 ${step > s ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Specialty */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Elegí una especialidad</h2>
            <div className="grid grid-cols-2 gap-3">
              {specialties.map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => { setSelectedSpecialty(spec); setStep(2) }}
                  className="p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-all text-left"
                >
                  <span className="text-2xl">{spec.icon}</span>
                  <h3 className="font-medium text-gray-900 mt-2">{spec.name}</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Doctor */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Elegí un profesional</h2>
            <div className="space-y-3">
              {doctors.filter(d => !selectedSpecialty || d.specialty === selectedSpecialty.name).map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => { setSelectedDoctor(doctor); setStep(3) }}
                  className="w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-all flex items-center gap-4"
                >
                  <img src={doctor.image} alt={doctor.name} className="w-14 h-14 rounded-full object-cover" />
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-gray-900">{doctor.name}</h3>
                    <p className="text-sm text-gray-500">{doctor.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">{doctor.rating}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Elegí fecha y hora</h2>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <img src={selectedDoctor?.image} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-medium text-gray-900">{selectedDoctor?.name}</p>
                  <p className="text-sm text-gray-500">{selectedDoctor?.specialty}</p>
                </div>
              </div>

              <input
                type="date"
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              />

              {selectedDate && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Horarios disponibles:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => { setSelectedTime(time); setStep(4) }}
                        className={`py-2 rounded-lg text-sm font-medium border ${
                          selectedTime === time
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-gray-200 text-gray-700 hover:border-emerald-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Completá tus datos</h2>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Profesional</span>
                  <span className="font-medium text-gray-900">{selectedDoctor?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium text-gray-900">{selectedDate?.toLocaleDateString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hora</span>
                  <span className="font-medium text-gray-900">{selectedTime}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="tel"
                placeholder="Teléfono (WhatsApp)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <textarea
                placeholder="Motivo de la consulta (opcional)"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <button
                onClick={() => setBooked(true)}
                disabled={!formData.name || !formData.phone}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
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
