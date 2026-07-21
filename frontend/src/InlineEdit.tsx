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
  // Capture the initial text once. We deliberately do NOT feed edits back into
  // the contentEditable's children — doing so re-renders and resets the caret to
  // the start on every keystroke, which reverses the typed text.
  const [initialValue] = useState(value)

  const onKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      ;(event.target as HTMLSpanElement).blur()
    }
  }

  const onBlur = (event: React.FocusEvent<HTMLSpanElement>) => {
    if (event.target.innerText !== value) {
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
      onKeyDown={onKeyDown}
      onBlur={onBlur}

      tabIndex={tabIndex}
    >
      {initialValue}
    </span>
  )
}

export default InlineEdit
