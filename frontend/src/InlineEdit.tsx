import './InlineEdit.css'

// From https://www.emgoto.com/react-inline-edit/

import { useState } from 'react'

interface InlineEditProps {
  placeholder: string
  value: string
  setValue: (val: string) => void
  tabIndex?: number
}

const InlineEdit = ({ placeholder, value, setValue, tabIndex }: InlineEditProps) => {
  const [editingValue, setEditingValue] = useState(value)

  const onChange = (event: React.FormEvent<HTMLSpanElement>) =>
    setEditingValue((event.target as HTMLSpanElement).innerText)

  const onKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      ;(event.target as HTMLSpanElement).blur()
    }
  }

  let lastVal = value

  const onBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
    if (event.target.innerText !== lastVal) {
      lastVal = event.target.innerText
      setValue(event.target.innerText)
    }
  }

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      className='InlineEdit'
      aria-label='Field name'
      role='textbox'
      onInput={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}

      tabIndex={tabIndex}
    >
      {editingValue}
    </span>
  )
}

export default InlineEdit
