import { useEffect, useState } from 'react'
import { AdminContext } from './AdminContext'
import AdminHeader from './AdminHeader'

export default function IsAdmin({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const getIsAdmin = async () => {
      try {
        fetch('/api/admin').then(async (response) => {
          if (!response.ok) {
            console.log('NOT OK RESPONSE')
            setIsAdmin(false)
          }
          console.log('OK RESPONSE')
          const body = await response.json()
          setIsAdmin(body.isAdmin)
        })
      } catch (err) {
        setIsAdmin(false)
      }
    }

    getIsAdmin()
  }, [])

  return (
    <AdminContext.Provider value={isAdmin}>
      {isAdmin && <AdminHeader />}
      {children}
    </AdminContext.Provider>
  )
}
