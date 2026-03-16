import { useState } from 'react'
import { VisibilityIcon, VisibilityOffIcon } from '../../icons'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function PasswordInput({ id, value, onChange, placeholder }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex gap-2 items-center">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="native-input text-[14px] flex-1 h-8 bg-three border-none text-contrast focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="text-secondary hover:text-contrast transition-colors"
      >
        {visible ? <VisibilityOffIcon size={18} /> : <VisibilityIcon size={18} />}
      </button>
    </div>
  )
}
