"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"

interface Item {
  id: string
  section: number
  subsection: string
  item_label: string
  estado: string
  observaciones: string
  photo_urls: string[]
}

const SECTION_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "1. Inspección Visual", color: "bg-blue-600" },
  2: { label: "2. Inspección Carrocería", color: "bg-violet-600" },
  3: { label: "3. Inspección Mecánica", color: "bg-teal-600" },
}

function getEstadoStyle(estado: string) {
  if (["N/A"].includes(estado)) return "bg-gray-100 text-gray-500"
  if (["Con Daño", "Malo", "Presenta"].includes(estado) && estado !== "No Presenta") return "bg-red-100 text-red-700"
  if (["Con Daño"].includes(estado)) return "bg-orange-100 text-orange-700"
  if (["Sin Daño", "Bueno", "Presenta", "Funciona", "Normal", "A nivel", "No Presenta"].includes(estado)) return "bg-green-100 text-green-700"
  return "bg-gray-100 text-gray-600"
}

export default function InspectionItemsView({ items }: { items: Item[] }) {
  const [openSections, setOpenSections] = useState<number[]>([1, 2, 3])
  const [openSubsections, setOpenSubsections] = useState<string[]>([])

  const sections = [1, 2, 3]

  function toggleSection(s: number) {
    setOpenSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function toggleSubsection(sub: string) {
    setOpenSubsections(prev => prev.includes(sub) ? prev.filter(x => x !== sub) : [...prev, sub])
  }

  return (
    <div className="space-y-3">
      {sections.map(section => {
        const sectionItems = items.filter(i => i.section === section)
        if (!sectionItems.length) return null
        const subsections = [...new Set(sectionItems.map(i => i.subsection))]
        const isOpen = openSections.includes(section)
        const sInfo = SECTION_LABELS[section]

        return (
          <div key={section} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection(section)}
              className={`w-full flex items-center justify-between p-4 ${sInfo.color} text-white`}
            >
              <span className="font-semibold text-sm">{sInfo.label}</span>
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isOpen && (
              <div>
                {subsections.map(sub => {
                  const subItems = sectionItems.filter(i => i.subsection === sub)
                  const isSubOpen = openSubsections.includes(sub)

                  return (
                    <div key={sub}>
                      <button
                        onClick={() => toggleSubsection(sub)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left border-b border-gray-100 transition"
                      >
                        <span className="text-xs font-bold text-gray-600">{sub}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{subItems.length} ítems</span>
                          {isSubOpen ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                        </div>
                      </button>
                      {isSubOpen && (
                        <div className="divide-y divide-gray-50">
                          {subItems.map(item => (
                            <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                              <div className="flex-1">
                                <p className="text-sm text-gray-700">{item.item_label}</p>
                                {item.observaciones && (
                                  <p className="text-xs text-gray-400 mt-0.5">{item.observaciones}</p>
                                )}
                                {item.photo_urls?.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {item.photo_urls.map((url, i) => (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                        <img src={url} alt="" className="w-10 h-10 object-cover rounded-md border" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className={cn("text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 mt-0.5", getEstadoStyle(item.estado))}>
                                {item.estado}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
