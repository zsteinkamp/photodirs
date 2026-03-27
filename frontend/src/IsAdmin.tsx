import { useEffect, useState } from 'react'
import { AdminContext } from './AdminContext'
import AdminHeader from './AdminHeader'

interface IsAdminProps {
  children: React.ReactNode
}

export default function IsAdmin({ children }: IsAdminProps) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const getIsAdmin = async () => {
      try {
        fetch('/api/admin').then(async (response) => {
          if (!response.ok) {
            setIsAdmin(false)
          }
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
