import { useState } from 'react'
const InlineEdit = ({ value, setValue, options = {} }) => {
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

  if (options.textarea) {
    // multiline
    return (
      <textarea
        rows={1}
        aria-label="Field name"
        value={editingValue}
        onBlur={onBlur}
        onChange={onChange}
      />
    )
  }

  // regular old single line
  return (
    <input
      type="text"
      aria-label="Field name"
      value={editingValue}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />
  )
}

export default InlineEdit
