const admin = require('firebase-admin')
const path = require('path')
const { logger } = require('../utils/logger')

let db = null
let auth = null

function initializeFirebase() {
  if (db) return { db, auth }

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
      path.join(__dirname, '../../config/serviceAccountKey.json')

    let serviceAccount
    try {
      serviceAccount = require(serviceAccountPath)
    } catch {
      logger.warn('Service account file not found, using default credentials')
    }

    const config = {
      credential: serviceAccount 
        ? admin.credential.cert(serviceAccount) 
        : admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    }

    admin.initializeApp(config)
    db = admin.firestore()
    auth = admin.auth()

    db.settings({
      ignoreUndefinedProperties: true,
    })

    logger.info('Firebase initialized successfully')
    return { db, auth }
  } catch (error) {
    logger.error('Firebase initialization failed:', error)
    throw error
  }
}

function getFirestore() {
  if (!db) initializeFirebase()
  return db
}

function getAuth() {
  if (!auth) initializeFirebase()
  return auth
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  admin,
}
