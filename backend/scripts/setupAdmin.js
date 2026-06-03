require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const admin = require('firebase-admin')
const path = require('path')

const serviceAccount = require(path.join(__dirname, '../config/serviceAccountKey.json'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()
const auth = admin.auth()

async function setup() {
  try {
    const email = 'vazquezale82@gmail.com'

    const userRecord = await auth.getUserByEmail(email)
    console.log('User found:', userRecord.uid)

    await db.collection('usuarios_admin').doc(userRecord.uid).set({
      email: email,
      nombre: 'Alejandro',
      role: 'super_admin',
      permissions: ['campaigns', 'leads', 'settings', 'billing'],
      api_credits: {
        apify: 1000,
        whatsapp: 500,
        inmoxil: 500,
      },
      plan: 'enterprise',
      fecha_creacion: new Date(),
      activo: true,
    })

    console.log('Admin document created in Firestore!')
    console.log('UID:', userRecord.uid)
    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

setup()
