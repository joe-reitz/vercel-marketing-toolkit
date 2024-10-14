'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'react-hot-toast'
import { saveAs } from 'file-saver'

const UnlayerEmailEditor = dynamic(() => import('@/components/UnlayerEmailEditor'), { ssr: false })

export default function EmailBuilderPage() {
  // const [savedDesign, setSavedDesign] = useState<object | null>(null)
  // const [exportedHtml, setExportedHtml] = useState<string | null>(null)

  const handleSave = (design: object) => {
    // setSavedDesign(design)
    const json = JSON.stringify(design)
    const blob = new Blob([json], { type: 'application/json' })
    saveAs(blob, 'email_design.json')
    toast.success('Design saved successfully!')
    console.log('Design saved:', design)
  }

  const handleExport = ({ html, design }: { html: string; design: object }) => {
    // setExportedHtml(html)
    const blob = new Blob([html], { type: 'text/html' })
    saveAs(blob, 'email_template.html')
    toast.success('HTML exported successfully!')
    console.log('HTML exported:', html)
    console.log('Final design:', design)
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-grow">
        <UnlayerEmailEditor 
          onSave={handleSave} 
          onExport={handleExport} 
        />
      </div>
    </div>
  )
}