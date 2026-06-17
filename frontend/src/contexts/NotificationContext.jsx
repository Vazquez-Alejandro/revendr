import { createContext, useContext, useEffect, useState } from 'react'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, collection, Timestamp } from 'firebase/firestore'
import app, { db } from '../config/firebase'
import toast from 'react-hot-toast'

const NotificationContext = createContext(null)

export function useNotifications() {
  return useContext(NotificationContext)
}

export { createNotification }

async function createNotification({ userId, type, title, body, link = null, data = {} }) {
  if (!userId || !type || !title) return
  const ref = doc(collection(db, 'notificaciones'))
  await setDoc(ref, {
    userId,
    type,
    title,
    body: body || '',
    data,
    read: false,
    createdAt: Timestamp.now(),
    link,
  })
}

export function NotificationProvider({ children }) {
  const [permission, setPermission] = useState('default')
  const [fcmToken, setFcmToken] = useState(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Las notificaciones no son soportadas en este navegador')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        try {
          const messaging = getMessaging(app)
          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || '',
          })
          if (token) {
            setFcmToken(token)
            toast.success('Notificaciones activadas')
            return true
          }
        } catch (e) {
          console.warn('FCM token registration skipped (VAPID key may not be configured):', e.message)
          toast.success('Notificaciones activadas (sin push)')
          return true
        }
      } else {
        toast.error('Permiso de notificaciones denegado')
        return false
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      toast.error('Error al activar notificaciones')
      return false
    }
  }

  useEffect(() => {
    if (permission === 'granted') {
      try {
        const messaging = getMessaging(app)
        const unsubscribe = onMessage(messaging, (payload) => {
          toast(payload.notification?.title || 'Notificación', {
            icon: '🔔',
            description: payload.notification?.body,
          })
        })
        return () => unsubscribe()
      } catch {
        // messaging not available
      }
    }
  }, [permission])

  return (
    <NotificationContext.Provider value={{ permission, fcmToken, requestPermission }}>
      {children}
    </NotificationContext.Provider>
  )
}
