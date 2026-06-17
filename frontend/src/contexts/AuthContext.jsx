import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail 
} from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [adminData, setAdminData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true)
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          // Check admin collection first
          const adminRef = doc(db, 'usuarios_admin', firebaseUser.uid)
          const adminSnap = await getDoc(adminRef)
          if (adminSnap.exists()) {
            setAdminData({ id: adminSnap.id, ...adminSnap.data() })
          } else {
            // Check client collection
            const clientRef = doc(db, 'usuarios', firebaseUser.uid)
            const clientSnap = await getDoc(clientRef)
            if (clientSnap.exists()) {
              setAdminData({ id: clientSnap.id, ...clientSnap.data() })
            } else {
              setAdminData(null)
            }
          }
        } catch (err) {
          console.error('Error loading user data:', err)
          setAdminData(null)
        }
      } else {
        setUser(null)
        setAdminData(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = useCallback(async (email, password) => {
    try {
      setError(null)
      const result = await signInWithEmailAndPassword(auth, email, password)
      return result.user
    } catch (err) {
      const errorMessage = getFirebaseAuthError(err.code)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth)
      setUser(null)
      setAdminData(null)
    } catch (err) {
      console.error('Sign out error:', err)
      throw err
    }
  }, [])

  const resetPassword = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      const errorMessage = getFirebaseAuthError(err.code)
      throw new Error(errorMessage)
    }
  }, [])

  const hasPermission = useCallback((permission) => {
    if (!adminData) return false
    if (adminData.role === 'super_admin') return true
    return adminData.permissions?.includes(permission) || false
  }, [adminData])

  const canUseAPI = useCallback((apiType, amount = 1) => {
    if (!adminData) return false
    const credits = adminData.api_credits || {}
    const available = credits[apiType] || 0
    return available >= amount
  }, [adminData])

  const value = {
    user,
    adminData,
    loading,
    error,
    signIn,
    signOut,
    resetPassword,
    clearError,
    hasPermission,
    canUseAPI,
    isAuthenticated: !!user,
    isAdmin: adminData?.role === 'super_admin' || adminData?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

function getFirebaseAuthError(code) {
  const errors = {
    'auth/user-not-found': 'No existe una cuenta con este correo electrónico',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-email': 'Correo electrónico inválido',
    'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo más tarde',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
  }
  return errors[code] || 'Error de autenticación desconocido'
}
