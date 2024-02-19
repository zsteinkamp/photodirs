import './Breadcrumb.css'
import { useContext } from 'react'
import { AdminContext } from './AdminContext'

import { Link } from 'react-router-dom'
import InlineEdit from './InlineEdit'

export default function Breadcrumb(props) {
  const isAdmin = useContext(AdminContext)
  const crumbArr = props.crumbs.map((crumb, idx) => {
    let itemMarkup
    if (idx === props.crumbs.length - 1) {
      if (isAdmin) {
        itemMarkup = (
          <InlineEdit
            placeholder="Enter a title..."
            value={crumb.title}
            setValue={props.onEdit}
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
  return <div className="Breadcrumb">{crumbArr}</div>
}
