import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'

/**
 * Loads a Laravel paginated endpoint and re-fetches whenever the filters or page change.
 * Returns { rows, meta, loading, error, page, setPage, reload }.
 */
export default function usePaginated(url, filters) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ rows: [], meta: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const filterKey = JSON.stringify(filters)

  // New filters start again from page 1.
  useEffect(() => setPage(1), [filterKey])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(JSON.parse(filterKey)).filter(([, v]) => v !== ''))
      const { data } = await api.get(url, { params: { ...params, page } })
      const { data: rows, ...meta } = data
      setResult({ rows, meta })
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [url, filterKey, page])

  useEffect(() => {
    // A short delay so typing in a search box doesn't fire a request per keystroke.
    const timer = setTimeout(reload, 250)
    return () => clearTimeout(timer)
  }, [reload])

  return { ...result, loading, error, page, setPage, reload }
}
