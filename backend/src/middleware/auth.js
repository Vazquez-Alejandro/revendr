const { getAuth, getFirestore } = require('../config/firebase')
const { logger } = require('../utils/logger')

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'No token provided' },
      })
    }

    const token = authHeader.split('Bearer ')[1]
    const auth = getAuth()

    const decodedToken = await auth.verifyIdToken(token)

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    }

    const db = getFirestore()
    const adminDoc = await db.collection('usuarios_admin').doc(decodedToken.uid).get()

    if (!adminDoc.exists) {
      return res.status(403).json({
        success: false,
        error: { message: 'User not authorized as admin' },
      })
    }

    req.adminData = adminDoc.data()

    next()
  } catch (error) {
    logger.error('Authentication error:', error)

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expired' },
      })
    }

    return res.status(401).json({
      success: false,
      error: { message: 'Invalid token' },
    })
  }
}

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.adminData?.role === 'super_admin') {
      return next()
    }

    const hasPermission = req.adminData?.permissions?.includes(permission)

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' },
      })
    }

    next()
  }
}

module.exports = { authenticate, requirePermission }
