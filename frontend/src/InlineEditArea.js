import './InlineEditArea.css'

// From https://www.emgoto.com/react-inline-edit/

import { useEffect, useRef, useState } from 'react'

const InlineEditArea = ({ placeholder, value, setValue, options = {} }) => {
  const [editingValue, setEditingValue] = useState(value)

  const onChange = (event) => setEditingValue(event.target.value)

  let lastVal = value
  const onBlur = (event) => {
    if (event.target.value !== lastVal) {
      lastVal = event.target.value
      setValue(event.target.value)
    }
  }

  const setHeight = (obj) => {
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

  return (
    <textarea
      className="InlineEditArea"
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

export default InlineEditArea
