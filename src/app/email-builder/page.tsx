'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'

const UnlayerEmailEditor = dynamic(() => import('@/components/UnlayerEmailEditor'), { ssr: false })

export default function EmailBuilderPage() {
  const [savedDesign, setSavedDesign] = useState<object | null>(null)
  const [exportedHtml, setExportedHtml] = useState<string | null>(null)

  const handleSave = (design: object) => {
    setSavedDesign(design)
    console.log('Design saved:', design)
    // Here you can implement logic to save the design to your backend or local storage
  }

  const handleExport = ({ html, design }: { html: string; design: object }) => {
    setExportedHtml(html)
    console.log('HTML exported:', html)
    console.log('Final design:', design)
    // Here you can implement logic to use the exported HTML, e.g., send it to your backend or copy to clipboard
  }

  return (
    <div className="h-full">
      <UnlayerEmailEditor onSave={handleSave} onExport={handleExport} />
    </div>
  )
}