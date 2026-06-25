"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function VehicleCombobox({ value, onChange, options, placeholder = "Seleccionar...", className, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  function select(opt: string) {
    onChange(opt)
    setQuery(opt)
    setOpen(false)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  function handleFocus() { setOpen(true) }
  function handleBlur() { setTimeout(() => setOpen(false), 150) }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed",
            className
          )}
        />
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.slice(0, 50).map(opt => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => select(opt)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  opt === value && "bg-blue-50 text-blue-700 font-medium"
                )}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
