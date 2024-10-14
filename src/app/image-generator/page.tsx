'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

const IMAGE_FORMATS = {
  'og': { width: 1200, height: 630, name: 'Social Media OG' },
  'youtube': { width: 1280, height: 720, name: 'YouTube Poster' },
  'email-small': { width: 600, height: 200, name: 'Email Banner (Small)' },
  'email-large': { width: 600, height: 400, name: 'Email Banner (Large)' },
}

const LOGO_OPTIONS = {
  'logotype': { src: '/vercel-logotype-light.svg', name: 'Vercel Logotype' },
  'icon': { src: '/vercel-icon-light.svg', name: 'Vercel Icon' },
}

type ImageFormat = keyof typeof IMAGE_FORMATS
type LogoOption = keyof typeof LOGO_OPTIONS

export default function ImageGenerator() {
  const [format, setFormat] = useState<ImageFormat>('og')
  const [logoOption, setLogoOption] = useState<LogoOption>('logotype')
  const [text, setText] = useState('Welcome to Vercel')
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 })
  const [logoPosition, setLogoPosition] = useState({ x: 10, y: 10 })
  const [textSize, setTextSize] = useState(10) // Starting with a larger default size
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logo, setLogo] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
<<<<<<< Updated upstream
    const logo = new Image()
    logo.src = '/vercel-logotype-light.svg'
    logo.onload = () => setVercelLogo(logo)
  }, [])
=======
    const img = new Image()
    img.src = LOGO_OPTIONS[logoOption].src
    img.onload = () => {
      setLogo(img)
      drawImage()
    }
    img.onerror = (e) => {
      console.error('Error loading logo:', e)
    }
  }, [logoOption])
>>>>>>> Stashed changes

  useEffect(() => {
    drawImage()
  }, [format, text, textPosition, logoPosition, logo, textSize, scale])

  useEffect(() => {
    const updateScale = () => {
      const { width } = IMAGE_FORMATS[format]
      const containerWidth = document.getElementById('preview-container')?.clientWidth || width
      setScale(Math.min(1, containerWidth / width))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [format])

  const drawImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = IMAGE_FORMATS[format]
    canvas.width = width
    canvas.height = height

    // Set background
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    // Draw logo
    if (logo) {
      const logoWidth = width * 0.2
      const logoHeight = (logoWidth / logo.width) * logo.height
      const logoX = (logoPosition.x / 100) * (width - logoWidth)
      const logoY = (logoPosition.y / 100) * (height - logoHeight)
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight)
    }

    // Draw text
    ctx.fillStyle = '#ffffff'
    const fontSize = Math.floor(height * (textSize / 100))
    ctx.font = `bold ${fontSize}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const textX = (textPosition.x / 100) * width
    const textY = (textPosition.y / 100) * height
    ctx.fillText(text, textX, textY)

    // Draw image dimensions
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '14px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`${width}x${height}`, 10, 10)
  }

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `vercel-image-${format}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Vercel Image Generator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="format-select">Image Format</Label>
            <Select value={format} onValueChange={(value: ImageFormat) => setFormat(value)}>
              <SelectTrigger id="format-select">
                <SelectValue placeholder="Select image format" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(IMAGE_FORMATS).map(([key, { name, width, height }]) => (
                  <SelectItem key={key} value={key}>{`${name} (${width}x${height})`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="logo-select">Logo Style</Label>
            <RadioGroup id="logo-select" value={logoOption} onValueChange={(value: LogoOption) => setLogoOption(value)}>
              {Object.entries(LOGO_OPTIONS).map(([key, { name }]) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={`logo-${key}`} />
                  <Label htmlFor={`logo-${key}`}>{name}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="text-input">Text</Label>
            <Input
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your text here"
            />
          </div>

          <div>
            <Label htmlFor="text-size">Text Size</Label>
            <div className="flex items-center space-x-2">
              <Slider
                id="text-size"
                min={1}
                max={50}
                step={1}
                value={[textSize]}
                onValueChange={(value) => setTextSize(value[0])}
              />
              <span className="w-12 text-center">{textSize}%</span>
            </div>
          </div>

          <div>
            <Label>Text Position</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="text-x">X</Label>
                <Slider
                  id="text-x"
                  min={0}
                  max={100}
                  step={1}
                  value={[textPosition.x]}
                  onValueChange={(value) => setTextPosition(prev => ({ ...prev, x: value[0] }))}
                />
              </div>
              <div>
                <Label htmlFor="text-y">Y</Label>
                <Slider
                  id="text-y"
                  min={0}
                  max={100}
                  step={1}
                  value={[textPosition.y]}
                  onValueChange={(value) => setTextPosition(prev => ({ ...prev, y: value[0] }))}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Logo Position</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="logo-x">X</Label>
                <Slider
                  id="logo-x"
                  min={0}
                  max={100}
                  step={1}
                  value={[logoPosition.x]}
                  onValueChange={(value) => setLogoPosition(prev => ({ ...prev, x: value[0] }))}
                />
              </div>
              <div>
                <Label htmlFor="logo-y">Y</Label>
                <Slider
                  id="logo-y"
                  min={0}
                  max={100}
                  step={1}
                  value={[logoPosition.y]}
                  onValueChange={(value) => setLogoPosition(prev => ({ ...prev, y: value[0] }))}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleExport}>Export Image</Button>
        </div>

        <div id="preview-container" className="border rounded p-4 overflow-auto bg-gray-900">
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
