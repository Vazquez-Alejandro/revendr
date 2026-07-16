import { useState, useRef } from 'react'
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { auth } from '../config/firebase'
import toast from 'react-hot-toast'

const API = 'https://us-central1-revendr-9add8.cloudfunctions.net/api'

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function CSVImport({ onImported, onClose }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const fileRef = useRef()

  const handleFile = (e) => {
    const selected = e.target.files[0]
    if (!selected) return

    if (!selected.name.endsWith('.csv') && !selected.name.endsWith('.txt')) {
      toast.error('Subí un archivo .csv o .txt')
      return
    }

    setFile(selected)
    setResults(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.trim().split('\n')
      if (lines.length < 2) {
        toast.error('El archivo necesita al menos una fila de headers y una de datos')
        return
      }
      const headers = lines[0].split(',').map(h => h.trim())
      const rows = []
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const values = lines[i].split(',').map(v => v.trim())
        rows.push(values)
      }
      setPreview({ headers, rows, total: lines.length - 1 })
    }
    reader.readAsText(selected)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)

    try {
      const text = await file.text()
      const res = await fetch(`${API}/whatsapp/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({ csvText: text }),
      })
      const data = await res.json()

      if (data.success) {
        setResults(data.data)
        toast.success(`${data.data.imported} leads importados`)
        if (onImported) onImported()
      } else {
        toast.error(data.error?.message || 'Error al importar')
      }
    } catch (e) {
      toast.error('Error al importar')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-100">Importar leads desde CSV</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!results ? (
          <>
            <div className="mb-4">
              <p className="text-xs text-dark-400 mb-2">
                El CSV debe tener columnas: <strong>nombre</strong>, <strong>telefono</strong>, y opcionalmente email, rubro, direccion
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFile}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current.click()}
                className="w-full p-6 border-2 border-dashed border-dark-700 rounded-xl text-center hover:border-brand-500/50 transition-all"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-dark-400" />
                <p className="text-sm text-dark-300">
                  {file ? file.name : 'Hacé click o arrastrá un archivo CSV'}
                </p>
              </button>
            </div>

            {preview && (
              <div className="mb-4">
                <p className="text-xs text-dark-400 mb-2">
                  Vista previa ({preview.total} leads encontrados):
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        {preview.headers.map((h, i) => (
                          <th key={i} className="px-2 py-1 text-left text-dark-400 border-b border-dark-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-2 py-1 text-dark-200 border-b border-dark-700/50">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-dark-800 text-dark-300 border border-dark-700 rounded-lg text-sm font-medium hover:bg-dark-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-dark-100 mb-1">
              {results.imported} leads importados
            </p>
            {results.skipped > 0 && (
              <p className="text-sm text-dark-400 mb-3">
                {results.skipped} filas ignoradas
              </p>
            )}
            {results.errors.length > 0 && (
              <div className="text-left bg-dark-900 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                {results.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400">
                    Fila {err.row}: {err.error}
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-all"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
