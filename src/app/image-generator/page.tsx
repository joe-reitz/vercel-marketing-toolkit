'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const IMAGE_FORMATS = {
  'og': { width: 1200, height: 630 },
  'youtube': { width: 1280, height: 720 },
  'email-small': { width: 600, height: 200 },
  'email-large': { width: 600, height: 400 },
}

type TextPosition = 'top' | 'middle' | 'bottom'
type TextAlignment = 'left' | 'center' | 'right'
type FontStyle = 'regular' | 'bold' | 'bold italic'
type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export default function ImageGenerator() {
  const [text, setText] = useState('')
  const [format, setFormat] = useState('og')
  const [textPosition, setTextPosition] = useState<TextPosition>('middle')
  const [textAlignment, setTextAlignment] = useState<TextAlignment>('center')
  const [fontStyle, setFontStyle] = useState<FontStyle>('bold')
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-left')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [vercelLogo, setVercelLogo] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const logo = new Image()
    logo.src = '/vercel-logotype-light.svg'
    logo.onload = () => setVercelLogo(logo)
  }, [])

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = IMAGE_FORMATS[format as keyof typeof IMAGE_FORMATS]
    canvas.width = width
    canvas.height = height

    // Set background to black
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    // Draw Vercel logo
    if (vercelLogo) {
      const logoHeight = Math.min(height / 4, 50)
      const logoWidth = (logoHeight / vercelLogo.height) * vercelLogo.width
      let logoX, logoY

      switch (logoPosition) {
        case 'top-left':
          logoX = 20
          logoY = 20
          break
        case 'top-right':
          logoX = width - logoWidth - 20
          logoY = 20
          break
        case 'bottom-left':
          logoX = 20
          logoY = height - logoHeight - 20
          break
        case 'bottom-right':
          logoX = width - logoWidth - 20
          logoY = height - logoHeight - 20
          break
      }

      ctx.drawImage(vercelLogo, logoX, logoY, logoWidth, logoHeight)
    }

    // Draw text
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = textAlignment
    ctx.textBaseline = 'middle'

    let fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal'
    let fontStyleText = fontStyle.includes('italic') ? 'italic' : 'normal'
    ctx.font = `${fontWeight} ${fontStyleText} ${Math.floor(height / 10)}px "Geist", sans-serif`

    const maxWidth = width - 40
    const words = text.split(' ')
    let lines = []
    let currentLine = words[0]

    for (let i = 1; i < words.length; i++) {
      let testLine = currentLine + ' ' + words[i]
      let metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth) {
        lines.push(currentLine)
        currentLine = words[i]
      } else {
        currentLine = testLine
      }
    }
    lines.push(currentLine)

    let y
    switch (textPosition) {
      case 'top':
        y = height * 0.2
        break
      case 'middle':
        y = height / 2 - (lines.length - 1) * Math.floor(height / 20) / 2
        break
      case 'bottom':
        y = height * 0.8 - (lines.length - 1) * Math.floor(height / 20)
        break
    }

    let x
    switch (textAlignment) {
      case 'left':
        x = 20
        break
      case 'center':
        x = width / 2
        break
      case 'right':
        x = width - 20
        break
    }

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y)
      y += Math.floor(height / 20)
    }
  }, [text, format, vercelLogo, textPosition, textAlignment, fontStyle, logoPosition])

  useEffect(() => {
    if (canvasRef.current && vercelLogo) {
      drawImage()
    }
  }, [text, format, vercelLogo, drawImage, textPosition, textAlignment, fontStyle, logoPosition])

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `vercel-image-${format}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
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
      <Select value={format} onValueChange={setFormat}>
        <SelectTrigger className="w-full max-w-md">
          <SelectValue placeholder="Select image format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="og">Social Media OG (1200x630)</SelectItem>
          <SelectItem value="youtube">YouTube Poster (1280x720)</SelectItem>
          <SelectItem value="email-small">Email Banner Small (600x200)</SelectItem>
          <SelectItem value="email-large">Email Banner Large (600x400)</SelectItem>
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <div>
          <Label className="mb-2 block">Text Position</Label>
          <RadioGroup value={textPosition} onValueChange={(value: TextPosition) => setTextPosition(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="top" id="top" />
              <Label htmlFor="top">Top</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="middle" id="middle" />
              <Label htmlFor="middle">Middle</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom" id="bottom" />
              <Label htmlFor="bottom">Bottom</Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label className="mb-2 block">Text Alignment</Label>
          <RadioGroup value={textAlignment} onValueChange={(value: TextAlignment) => setTextAlignment(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="left" id="left" />
              <Label htmlFor="left">Left</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="center" id="center" />
              <Label htmlFor="center">Center</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="right" id="right" />
              <Label htmlFor="right">Right</Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label className="mb-2 block">Font Style</Label>
          <RadioGroup value={fontStyle} onValueChange={(value: FontStyle) => setFontStyle(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="regular" id="regular" />
              <Label htmlFor="regular">Regular</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bold" id="bold" />
              <Label htmlFor="bold">Bold</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bold italic" id="bold-italic" />
              <Label htmlFor="bold-italic">Bold Italic</Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label className="mb-2 block">Logo Position</Label>
          <RadioGroup value={logoPosition} onValueChange={(value: LogoPosition) => setLogoPosition(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="top-left" id="top-left" />
              <Label htmlFor="top-left">Top Left</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="top-right" id="top-right" />
              <Label htmlFor="top-right">Top Right</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom-left" id="bottom-left" />
              <Label htmlFor="bottom-left">Bottom Left</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom-right" id="bottom-right" />
              <Label htmlFor="bottom-right">Bottom Right</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      <canvas ref={canvasRef} className="border border-gray-300" />
      <Button onClick={handleExport}>Export Image</Button>
    </div>
  )
}