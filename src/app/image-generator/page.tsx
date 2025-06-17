'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"

const IMAGE_FORMATS = {
  'og': { width: 1200, height: 630 },
  'youtube': { width: 1280, height: 720 },
  'email-small': { width: 600, height: 200 },
  'email-large': { width: 600, height: 400 },
  'banner': { width: 2048, height: 600 },
}

type Position = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
type FontStyle = 'regular' | 'bold' | 'bold italic'
type LogoType = 'logotype' | 'icon'

const BASE_URL = 'https://d1x0zcqhnlqelh.cloudfront.net/images/69d2b268e16ef23a7e81dd3abc50ec84/Vercel%20Logos/'

export default function ImageGenerator() {
  const [text, setText] = useState('')
  const [format, setFormat] = useState('og')
  const [textPosition, setTextPosition] = useState<Position>('middle-center')
  const [fontStyle, setFontStyle] = useState<FontStyle>('bold')
  const [logoPosition, setLogoPosition] = useState<Position>('top-left')
  const [logoType, setLogoType] = useState<LogoType>('logotype')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [logoSize, setLogoSize] = useState(15)
  const [textSize, setTextSize] = useState(15)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [vercelLogo, setVercelLogo] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const loadImage = () => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = `${BASE_URL}vercel-${logoType}-${isDarkMode ? 'light' : 'dark'}.png`
      img.onload = () => setVercelLogo(img)
    }
    loadImage()
  }, [logoType, isDarkMode])

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = IMAGE_FORMATS[format as keyof typeof IMAGE_FORMATS]
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = isDarkMode ? '#000000' : '#ffffff'
    ctx.fillRect(0, 0, width, height)

    if (vercelLogo) {
      const logoHeight = Math.min(height * (logoSize / 100), height)
      const logoWidth = (logoHeight / vercelLogo.height) * vercelLogo.width
      const [logoX, logoY] = getPosition(logoPosition, width, height, logoWidth, logoHeight)
      ctx.drawImage(vercelLogo, logoX, logoY, logoWidth, logoHeight)
    }

    ctx.fillStyle = isDarkMode ? '#ffffff' : '#000000'
    ctx.textBaseline = 'top'

    const fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal'
    const fontStyleText = fontStyle.includes('italic') ? 'italic' : 'normal'
    const fontSize = Math.floor(height * (textSize / 100))
    ctx.font = `${fontWeight} ${fontStyleText} ${fontSize}px Arial, sans-serif`

    const padding = Math.floor(width / 20)
    const maxWidth = width - (padding * 2)
    const words = text.split(' ')
    const lines = []
    let currentLine = words[0]

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i]
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth) {
        lines.push(currentLine)
        currentLine = words[i]
      } else {
        currentLine = testLine
      }
    }
    lines.push(currentLine)

    const lineHeight = fontSize * 1.2
    const totalTextHeight = lines.length * lineHeight

    let textX: number
    let textY: number

    switch (textPosition) {
      case 'top-left':
      case 'middle-left':
      case 'bottom-left':
        textX = padding
        ctx.textAlign = 'left'
        break
      case 'top-center':
      case 'middle-center':
      case 'bottom-center':
        textX = width / 2
        ctx.textAlign = 'center'
        break
      case 'top-right':
      case 'middle-right':
      case 'bottom-right':
        textX = width - padding
        ctx.textAlign = 'right'
        break
    }

    switch (textPosition) {
      case 'top-left':
      case 'top-center':
      case 'top-right':
        textY = padding
        break
      case 'middle-left':
      case 'middle-center':
      case 'middle-right':
        textY = (height - totalTextHeight) / 2
        break
      case 'bottom-left':
      case 'bottom-center':
      case 'bottom-right':
        textY = height - totalTextHeight - padding
        break
    }

    lines.forEach((line, index) => {
      ctx.fillText(line, textX, textY + index * lineHeight)
    })
  }, [text, format, vercelLogo, textPosition, fontStyle, logoPosition, isDarkMode, logoSize, textSize])

  useEffect(() => {
    if (canvasRef.current) {
      drawImage()
    }
  }, [drawImage])

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const link = document.createElement('a')
      link.download = `vercel-image-${format}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error("Failed to export image:", error)
      alert("Failed to export image. Please try again.")
    }
  }

  const getPosition = (position: Position, width: number, height: number, elementWidth: number, elementHeight: number): [number, number] => {
    const padding = Math.floor(width / 20)
    let x: number, y: number
    switch (position) {
      case 'top-left':
        x = padding
        y = padding
        break
      case 'top-center':
        x = (width - elementWidth) / 2
        y = padding
        break
      case 'top-right':
        x = width - elementWidth - padding
        y = padding
        break
      case 'middle-left':
        x = padding
        y = (height - elementHeight) / 2
        break
      case 'middle-center':
        x = (width - elementWidth) / 2
        y = (height - elementHeight) / 2
        break
      case 'middle-right':
        x = width - elementWidth - padding
        y = (height - elementHeight) / 2
        break
      case 'bottom-left':
        x = padding
        y = height - elementHeight - padding
        break
      case 'bottom-center':
        x = (width - elementWidth) / 2
        y = height - elementHeight - padding
        break
      case 'bottom-right':
        x = width - elementWidth - padding
        y = height - elementHeight - padding
        break
    }
    return [x, y]
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h1 className="text-2xl font-bold">Vercel Image Generator</h1>
      <Input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter your text here"
        className="w-full max-w-md"
      />
      <Select value={format} onValueChange={(value: string) => setFormat(value)}>
        <SelectTrigger className="w-full max-w-md">
          <SelectValue placeholder="Select image format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="og">Social Media OG (1200x630)</SelectItem>
          <SelectItem value="youtube">YouTube Poster (1280x720)</SelectItem>
          <SelectItem value="email-small">Email Banner Small (600x200)</SelectItem>
          <SelectItem value="email-large">Email Banner Large (600x400)</SelectItem>
          <SelectItem value="banner">Banner (2048x100)</SelectItem>
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <div>
          <Label className="mb-2 block">Text Position</Label>
          <Select value={textPosition} onValueChange={(value: Position) => setTextPosition(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select text position" />
            </SelectTrigger>
            <SelectContent>
              {(['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const).map((pos) => (
                <SelectItem key={pos} value={pos}>{pos.replace('-', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">Font Style</Label>
          <Select value={fontStyle} onValueChange={(value: FontStyle) => setFontStyle(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select font style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="bold italic">Bold Italic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">Logo Position</Label>
          <Select value={logoPosition} onValueChange={(value: Position) => setLogoPosition(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select logo position" />
            </SelectTrigger>
            <SelectContent>
              {(['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const).map((pos) => (
                <SelectItem key={pos} value={pos}>{pos.replace('-', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">Logo Type</Label>
          <Select value={logoType} onValueChange={(value: LogoType) => setLogoType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select logo type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="logotype">Logotype</SelectItem>
              <SelectItem value="icon">Icon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="w-full max-w-md space-y-4">
        <div>
          <Label className="mb-2 block">Logo Size</Label>
          <Slider
            min={1}
            max={100}
            step={1}
            value={[logoSize]}
            onValueChange={(value) => setLogoSize(value[0])}
          />
        </div>
        <div>
          <Label className="mb-2 block">Text Size</Label>
          <Slider
            min={1}
            max={30}
            step={1}
            value={[textSize]}
            onValueChange={(value) => setTextSize(value[0])}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="dark-mode"
          checked={isDarkMode}
          onCheckedChange={setIsDarkMode}
        />
        <Label htmlFor="dark-mode">Dark Mode</Label>
      </div>
      <div style={{ width: '100%', maxWidth: '600px', overflow: 'auto' }}>
        <canvas ref={canvasRef} className="border border-gray-300" style={{ width: '100%', height: 'auto' }} />
      </div>
      <Button onClick={handleExport} className="bg-blue-500 hover:bg-blue-800 text-white">Export Image</Button>
    </div>
  )
}