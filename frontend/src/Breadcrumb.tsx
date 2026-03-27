import './Breadcrumb.css'
import { useContext } from 'react'
import { AdminContext } from './AdminContext'

import { Link } from 'react-router-dom'
import InlineEdit from './InlineEdit'
import { BreadcrumbItem } from './types'

interface BreadcrumbProps {
  crumbs: BreadcrumbItem[]
  onEdit: (val: string) => void
}

export default function Breadcrumb({ crumbs, onEdit }: BreadcrumbProps) {
  const isAdmin = useContext(AdminContext)
  const crumbArr = crumbs.map((crumb, idx) => {
    let itemMarkup
    if (idx === crumbs.length - 1) {
      if (isAdmin) {
        itemMarkup = (
          <InlineEdit
            placeholder='Enter a title...'
            value={crumb.title}
            setValue={onEdit}
          />
        )
      } else {
        itemMarkup = <strong>{crumb.title}</strong>
      }
    } else {
      itemMarkup = <Link to={crumb.path}>{crumb.title}</Link>
    }
    return <div key={crumb.path}>{itemMarkup}</div>
  })
  return <div className='Breadcrumb'>{crumbArr}</div>
}
