import { useMemo, useState } from 'react'
import { AlbumFile, PhotoLocation } from './types'

interface LocationEditorProps {
  file: AlbumFile
  albumFiles: AlbumFile[]
  setLocation: (file: AlbumFile, location: PhotoLocation | null) => Promise<void>
}

interface GeocodeResult {
  label: string
  lat: number
  lon: number
}

const distinctOtherLocations = (
  files: AlbumFile[],
  current: AlbumFile,
): PhotoLocation[] => {
  const seen = new Set<string>()
  const out: PhotoLocation[] = []
  for (const f of files) {
    if (f.fileName === current.fileName) continue
    const loc = f.location
    if (!loc) continue
    const key = `${loc.lat.toFixed(5)},${loc.lon.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(loc)
  }
  return out
}

export default function LocationEditor({
  file,
  albumFiles,
  setLocation,
}: LocationEditorProps) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<GeocodeResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const otherLocations = useMemo(
    () => distinctOtherLocations(albumFiles, file),
    [albumFiles, file],
  )

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setError(null)
    setResults(null)
    try {
      const resp = await fetch(
        '/api/admin/geocode?q=' + encodeURIComponent(q),
      )
      if (!resp.ok) {
        setError('Geocode failed')
        return
      }
      const data = (await resp.json()) as { results: GeocodeResult[] }
      if (!data.results || data.results.length === 0) {
        setError('No results')
        return
      }
      setResults(data.results)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSearching(false)
    }
  }

  const apply = async (loc: PhotoLocation | GeocodeResult) => {
    await setLocation(file, {
      lat: loc.lat,
      lon: loc.lon,
      label: loc.label ?? null,
    })
    setQuery('')
    setResults(null)
  }

  if (file.location) {
    return (
      <div className='LocationEditor located'>
        <span className='locationPin'>📍</span>
        <span className='locationLabel'>
          {file.location.label || `${file.location.lat.toFixed(4)}, ${file.location.lon.toFixed(4)}`}
        </span>
        <button
          className='clearLocation'
          title='Clear location'
          onClick={() => setLocation(file, null)}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div className='LocationEditor'>
      <form onSubmit={runSearch} className='locationSearch'>
        <input
          type='text'
          placeholder='Search a place…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type='submit' disabled={searching}>
          {searching ? '…' : 'Search'}
        </button>
      </form>
      {error && <div className='locationError'>{error}</div>}
      {results && results.length > 0 && (
        <div className='locationResults'>
          {results.map((r) => (
            <button
              key={`${r.lat},${r.lon}`}
              className='locationResult'
              onClick={() => apply(r)}
              title={`${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      {otherLocations.length > 0 && (
        <div className='locationOthers'>
          {otherLocations.map((loc) => (
            <button
              key={`${loc.lat},${loc.lon}`}
              className='locationOther'
              onClick={() => apply(loc)}
              title={`${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`}
            >
              📍 {loc.label || `${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
