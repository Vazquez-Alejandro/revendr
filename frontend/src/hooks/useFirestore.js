import { useState, useEffect, useCallback } from 'react'

export function useFirestoreQuery(collection, filters = [], options = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { 
    orderBy: orderByField = 'fecha_creacion',
    orderDirection = 'desc',
    limit: queryLimit = 50,
    enabled = true 
  } = options

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { collection: firestoreCollection, query, where, orderBy, limit: firestoreLimit, getDocs } = 
        await import('firebase/firestore')
      const { db } = await import('../config/firebase')

      let q = firestoreCollection(db, collection)

      for (const filter of filters) {
        if (filter.field && filter.operator && filter.value !== undefined) {
          q = query(q, where(filter.field, filter.operator, filter.value))
        }
      }

      q = query(q, orderBy(orderByField, orderDirection))
      q = query(q, firestoreLimit(queryLimit))

      const snapshot = await getDocs(q)
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      setData(results)
    } catch (err) {
      console.error(`Error fetching ${collection}:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [collection, JSON.stringify(filters), orderByField, orderDirection, queryLimit, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}

export function useDocument(docPath, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { enabled = true } = options

  useEffect(() => {
    if (!enabled || !docPath) {
      setLoading(false)
      return
    }

    const fetchDocument = async () => {
      try {
        setLoading(true)
        const { doc, getDoc } = await import('firebase/firestore')
        const { db } = await import('../config/firebase')

        const docRef = doc(db, docPath)
        const snapshot = await getDoc(docRef)

        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() })
        } else {
          setData(null)
        }
      } catch (err) {
        console.error(`Error fetching document:`, err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [docPath, enabled])

  return { data, loading, error }
}
