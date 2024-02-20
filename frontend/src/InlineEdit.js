import './InlineEdit.css'

// From https://www.emgoto.com/react-inline-edit/

import { useEffect, useRef, useState } from 'react'

const InlineEdit = ({ placeholder, value, setValue, options = {} }) => {
  const [editingValue, setEditingValue] = useState(value)

  const onChange = (event) => setEditingValue(event.target.value)

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.target.blur()
    }
  }

  const onBlur = (event) => {
    setValue(event.target.value)
  }

  const setHeight = (obj) => {
    console.log('SETHEIGHT', { obj })
    if (obj && obj.style) {
      obj.style.height = obj.scrollHeight + 'px'
    }
  }

  const textAreaRef = useRef()

  useEffect(() => {
    if (textAreaRef && textAreaRef.current) {
      setHeight(textAreaRef.current)
    }
  }, [textAreaRef])

  const onInput = (event) => {
    setHeight(event.target)
  }

  if (options.textarea) {
    // multiline
    return (
      <textarea
        className="InlineEdit"
        rows={1}
        ref={textAreaRef}
        aria-label="Field name"
        value={editingValue}
        onBlur={onBlur}
        onChange={onChange}
        placeholder={placeholder}
        onInput={onInput}
      />
    )
  }

  // regular old single line
  return (
    <input
      className="InlineEdit"
      type="text"
      aria-label="Field name"
      value={editingValue}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  )
}

export default InlineEdit