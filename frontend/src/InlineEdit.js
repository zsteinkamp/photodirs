import './InlineEdit.css'

// From https://www.emgoto.com/react-inline-edit/

import { useState } from 'react'

const InlineEdit = ({ placeholder, value, setValue, options = {} }) => {
  const [editingValue, setEditingValue] = useState(value)

  const onChange = (event) => setEditingValue(event.target.innerText)

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.target.blur()
    }
  }

  let lastVal = value

  const onBlur = (event) => {
    if (event.target.innerText !== lastVal) {
      lastVal = event.target.innerText
      setValue(event.target.innerText)
    }
  }

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      className="InlineEdit"
      type="text"
      aria-label="Field name"
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
    >
      {editingValue}
    </span>
  )
}

export default InlineEdit
