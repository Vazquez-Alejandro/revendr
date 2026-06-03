import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail 
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
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
    let unsubscribeAdmin = null

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            setUser(firebaseUser)

            const adminRef = doc(db, 'usuarios_admin', firebaseUser.uid)
            
            unsubscribeAdmin = onSnapshot(
              adminRef,
              (docSnap) => {
                if (docSnap.exists()) {
                  setAdminData({ id: docSnap.id, ...docSnap.data() })
                } else {
                  setAdminData(null)
                }
                setLoading(false)
              },
              (err) => {
                console.error('Error listening to admin data:', err)
                setAdminData(null)
                setLoading(false)
              }
            )
          } else {
            setUser(null)
            setAdminData(null)
            setLoading(false)
          }
        } catch (err) {
          console.error('Auth state change error:', err)
          setError(err.message)
          setLoading(false)
        }
      }
    )

    return () => {
      unsubscribeAuth()
      if (unsubscribeAdmin) unsubscribeAdmin()
    }
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

  const deductCredit = useCallback(async (apiType, amount = 1) => {
    if (!adminData) throw new Error('No admin data available')
    
    const currentCredits = adminData.api_credits?.[apiType] || 0
    if (currentCredits < amount) {
      throw new Error(`Insufficient ${apiType} credits`)
    }

    const adminRef = doc(db, 'usuarios_admin', adminData.id)
    await updateDoc(adminRef, {
      [`api_credits.${apiType}`]: currentCredits - amount
    })
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
    deductCredit,
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
