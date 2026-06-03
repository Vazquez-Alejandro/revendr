const { getFirestore } = require('../config/firebase')
const { logger } = require('../utils/logger')
const axios = require('axios')

class DemoGeneratorService {
  constructor() {
    this.db = getFirestore()
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    this.demoBaseUrl = process.env.DEMO_BASE_URL || 'https://turnos.revendr.app'
    this.inmoxilApiUrl = process.env.INMOXIL_API_URL
    this.inmoxilApiKey = process.env.INMOXIL_API_KEY
  }

  async generate(lead) {
    const generators = {
      inmobiliaria: () => this.generateInmobiliariaDemo(lead),
      estetica: () => this.generateEsteticaDemo(lead),
      clinica: () => this.generateClinicaDemo(lead),
      restaurante: () => this.generateRestauranteDemo(lead),
      gimnasio: () => this.generateGimnasioDemo(lead),
    }

    const generator = generators[lead.rubro]
    
    if (!generator) {
      logger.warn('No generator for rubro, using generic:', lead.rubro)
      return this.generateGenericDemo(lead)
    }

    return generator()
  }

  async generateInmobiliariaDemo(lead) {
    try {
      let propertyData = null

      if (this.inmoxilApiUrl && this.inmoxilApiKey) {
        propertyData = await this.fetchPropertyFromInmoxil(lead)
      }

      const demoData = {
        businessName: lead.nombre_negocio,
        logo: lead.datos_personalizados?.imageUrl || null,
        properties: propertyData ? [propertyData] : this.getMockProperties(lead),
        colors: this.generateBrandColors(lead.nombre_negocio),
        contactInfo: {
          phone: lead.telefono_whatsapp,
          email: lead.email,
        },
      }

      const demoId = `demo-inmo-${lead.id || Date.now()}`
      const demoUrl = `${this.demoBaseUrl}/demo/inmobiliaria/${demoId}`

      await this.db.collection('demos').doc(demoId).set({
        ...demoData,
        leadId: lead.id,
        rubro: 'inmobiliaria',
        createdAt: new Date(),
      })

      logger.info('Inmobiliaria demo generated:', { demoId, leadId: lead.id })

      return {
        url: demoUrl,
        data: demoData,
      }
    } catch (error) {
      logger.error('Error generating inmobiliaria demo:', error)
      throw error
    }
  }

  async fetchPropertyFromInmoxil(lead) {
    try {
      const response = await axios.get(`${this.inmoxilApiUrl}/properties`, {
        params: {
          agency: lead.nombre_negocio,
          limit: 1,
        },
        headers: {
          'Authorization': `Bearer ${this.inmoxilApiKey}`,
        },
        timeout: 10000,
      })

      if (response.data?.length > 0) {
        return response.data[0]
      }

      return null
    } catch (error) {
      logger.warn('Could not fetch from Inmoxil, using mock:', error.message)
      return null
    }
  }

  getMockProperties(lead) {
    return [
      {
        id: 'mock-1',
        title: 'Departamento 3 ambientes en Palermo',
        price: '$180.000',
        address: 'Av. Santa Fe 1234, Palermo',
        bedrooms: 3,
        bathrooms: 2,
        area: '85m²',
        image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      },
      {
        id: 'mock-2',
        title: 'Casa con jardín en San Isidro',
        price: '$450.000',
        address: 'Calle San Martín 567, San Isidro',
        bedrooms: 4,
        bathrooms: 3,
        area: '220m²',
        image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      },
    ]
  }

  async generateEsteticaDemo(lead) {
    const demoData = {
      businessName: lead.nombre_negocio,
      logo: lead.datos_personalizados?.imageUrl || null,
      services: this.getMockServices(),
      turnosDisponibles: this.generateMockTurnos(),
      colors: this.generateBrandColors(lead.nombre_negocio),
      contactInfo: {
        phone: lead.telefono_whatsapp,
        email: lead.email,
        address: lead.datos_personalizados?.address || '',
      },
    }

    const demoId = `demo-estetica-${lead.id || Date.now()}`
    const demoUrl = `${this.demoBaseUrl}/demo/estetica/${demoId}`

    await this.db.collection('demos').doc(demoId).set({
      ...demoData,
      leadId: lead.id,
      rubro: 'estetica',
      createdAt: new Date(),
    })

    logger.info('Estetica demo generated:', { demoId, leadId: lead.id })

    return {
      url: demoUrl,
      data: demoData,
    }
  }

  getMockServices() {
    return [
      { id: 1, name: 'Corte de Cabello', duration: 30, price: '$3.500' },
      { id: 2, name: 'Coloración', duration: 90, price: '$8.000' },
      { id: 3, name: 'Manicuría', duration: 45, price: '$2.500' },
      { id: 4, name: 'Depilación', duration: 60, price: '$4.000' },
      { id: 5, name: 'Masaje Facial', duration: 40, price: '$5.000' },
    ]
  }

  generateMockTurnos() {
    const turnos = []
    const today = new Date()
    
    for (let day = 0; day < 7; day++) {
      const date = new Date(today)
      date.setDate(today.getDate() + day)
      
      for (let hour = 9; hour <= 18; hour += 2) {
        if (Math.random() > 0.3) {
          turnos.push({
            date: date.toISOString().split('T')[0],
            time: `${hour.toString().padStart(2, '0')}:00`,
            available: true,
          })
        }
      }
    }
    
    return turnos
  }

  async generateClinicaDemo(lead) {
    const demoData = {
      businessName: lead.nombre_negocio,
      logo: lead.datos_personalizados?.imageUrl || null,
      specialties: ['Medicina General', 'Pediatría', 'Cardiología', 'Dermatología'],
      doctors: [
        { name: 'Dr. Carlos Méndez', specialty: 'Medicina General' },
        { name: 'Dra. Ana López', specialty: 'Pediatría' },
      ],
      colors: this.generateBrandColors(lead.nombre_negocio),
      contactInfo: {
        phone: lead.telefono_whatsapp,
        email: lead.email,
        address: lead.datos_personalizados?.address || '',
      },
    }

    const demoId = `demo-clinica-${lead.id || Date.now()}`
    const demoUrl = `${this.demoBaseUrl}/demo/clinica/${demoId}`

    await this.db.collection('demos').doc(demoId).set({
      ...demoData,
      leadId: lead.id,
      rubro: 'clinica',
      createdAt: new Date(),
    })

    return { url: demoUrl, data: demoData }
  }

  async generateRestauranteDemo(lead) {
    const demoData = {
      businessName: lead.nombre_negocio,
      logo: lead.datos_personalizados?.imageUrl || null,
      menu: [
        { category: 'Entradas', items: ['Empanadas', 'Provoleta', 'Ensalada César'] },
        { category: 'Platos Principales', items: ['Ojo de Bife', 'Milanesa Napolitana', 'Risotto'] },
        { category: 'Postres', items: ['Flan', 'Dulce de Leche', 'Tiramisú'] },
      ],
      colors: this.generateBrandColors(lead.nombre_negocio),
      contactInfo: {
        phone: lead.telefono_whatsapp,
        email: lead.email,
      },
    }

    const demoId = `demo-resto-${lead.id || Date.now()}`
    const demoUrl = `${this.demoBaseUrl}/demo/restaurante/${demoId}`

    await this.db.collection('demos').doc(demoId).set({
      ...demoData,
      leadId: lead.id,
      rubro: 'restaurante',
      createdAt: new Date(),
    })

    return { url: demoUrl, data: demoData }
  }

  async generateGimnasioDemo(lead) {
    const demoData = {
      businessName: lead.nombre_negocio,
      logo: lead.datos_personalizados?.imageUrl || null,
      plans: [
        { name: 'Básico', price: '$5.000/mes', features: ['Acceso al gimnasio', '1 clase grupal'] },
        { name: 'Premium', price: '$8.000/mes', features: ['Acceso ilimitado', 'Clases ilimitadas', 'Locker'] },
        { name: 'VIP', price: '$12.000/mes', features: ['Todo Premium', 'Personal trainer', 'Spa'] },
      ],
      classes: ['Yoga', 'CrossFit', 'Spinning', 'Pilates'],
      colors: this.generateBrandColors(lead.nombre_negocio),
      contactInfo: {
        phone: lead.telefono_whatsapp,
        email: lead.email,
      },
    }

    const demoId = `demo-gym-${lead.id || Date.now()}`
    const demoUrl = `${this.demoBaseUrl}/demo/gimnasio/${demoId}`

    await this.db.collection('demos').doc(demoId).set({
      ...demoData,
      leadId: lead.id,
      rubro: 'gimnasio',
      createdAt: new Date(),
    })

    return { url: demoUrl, data: demoData }
  }

  async generateGenericDemo(lead) {
    const demoData = {
      businessName: lead.nombre_negocio,
      logo: lead.datos_personalizados?.imageUrl || null,
      features: ['Gestión de turnos', 'Panel de control', 'Reportes', 'Notificaciones'],
      colors: this.generateBrandColors(lead.nombre_negocio),
      contactInfo: {
        phone: lead.telefono_whatsapp,
        email: lead.email,
      },
    }

    const demoId = `demo-generic-${lead.id || Date.now()}`
    const demoUrl = `${this.demoBaseUrl}/demo/generic/${demoId}`

    await this.db.collection('demos').doc(demoId).set({
      ...demoData,
      leadId: lead.id,
      rubro: lead.rubro,
      createdAt: new Date(),
    })

    return { url: demoUrl, data: demoData }
  }

  generateBrandColors(businessName) {
    const hash = businessName.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)

    const hue = Math.abs(hash % 360)
    
    return {
      primary: `hsl(${hue}, 70%, 50%)`,
      secondary: `hsl(${(hue + 30) % 360}, 60%, 40%)`,
      accent: `hsl(${(hue + 180) % 360}, 50%, 60%)`,
      background: '#ffffff',
      text: '#1a1a1a',
    }
  }
}

module.exports = { DemoGeneratorService }
