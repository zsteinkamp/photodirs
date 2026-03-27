import './InlineEditArea.css'

// From https://www.emgoto.com/react-inline-edit/

import { useEffect, useRef, useState } from 'react'

interface InlineEditAreaProps {
  placeholder: string
  value: string
  setValue: (val: string) => void
  tabIndex?: number
  children?: React.ReactNode
}

const InlineEditArea = ({ placeholder, value, setValue, tabIndex }: InlineEditAreaProps) => {
  const [editingValue, setEditingValue] = useState(value)

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) =>
    setEditingValue(event.target.value)

  let lastVal = value
  const onBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (event.target.value !== lastVal) {
      lastVal = event.target.value
      setValue(event.target.value)
    }
  }

  const setHeight = (obj: HTMLTextAreaElement) => {
    obj.style.height = obj.scrollHeight + 'px'
  }

  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textAreaRef.current) {
      setHeight(textAreaRef.current)
    }
  }, [])

  const onInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    setHeight(event.target as HTMLTextAreaElement)
  }

  return (
    <textarea
      className='InlineEditArea'
      rows={1}
      ref={textAreaRef}
      aria-label='Field name'
      value={editingValue}
      onBlur={onBlur}
      onChange={onChange}
      placeholder={placeholder}
      onInput={onInput}
      tabIndex={tabIndex}
    />
  )
}

export default InlineEditArea
