import { createContext, useContext, useEffect, useState } from 'react'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import app from '../config/firebase'
import toast from 'react-hot-toast'

const NotificationContext = createContext(null)

export function useNotifications() {
  return useContext(NotificationContext)
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
        const messaging = getMessaging(app)
        const token = await getToken(messaging, {
          vapidKey: 'YOUR_VAPID_KEY',
        })
        setFcmToken(token)
        toast.success('Notificaciones activadas')
        return true
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
      const messaging = getMessaging(app)
      const unsubscribe = onMessage(messaging, (payload) => {
        toast(payload.notification?.title || 'Notificación', {
          icon: '🔔',
          description: payload.notification?.body,
        })
      })

      return () => unsubscribe()
    }
  }, [permission])

  return (
    <NotificationContext.Provider value={{ permission, fcmToken, requestPermission }}>
      {children}
    </NotificationContext.Provider>
  )
}
