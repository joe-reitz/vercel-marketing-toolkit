'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LOGO_OPTIONS = {
  'vercel-logotype': { src: '/vercel-logotype-light.svg', alt: 'Vercel Logotype' },
  'vercel-icon': { src: '/vercel-icon-light.svg', alt: 'Vercel Icon' },
}

type LogoOption = keyof typeof LOGO_OPTIONS

const IMAGE_SIZES = {
  'twitter': { width: 1200, height: 675, label: 'Twitter (1200x675)' },
  'facebook': { width: 1200, height: 630, label: 'Facebook (1200x630)' },
  'instagram': { width: 1080, height: 1080, label: 'Instagram (1080x1080)' },
  'og-image': { width: 1200, height: 630, label: 'OG Image (1200x630)' },
  'email-banner-large': { width: 600, height: 400, label: 'Email Banner Large (600x400)' },
  'email-banner-small': { width: 600, height: 200, label: 'Email Banner Small (600x200)' },
  'youtube-poster': { width: 1280, height: 720, label: 'YouTube Poster (1280x720)' },
}

type ImageSize = keyof typeof IMAGE_SIZES

const ALIGNMENTS = ['left', 'center', 'right'] as const
const VERTICAL_POSITIONS = ['top', 'middle', 'bottom'] as const

type Alignment = typeof ALIGNMENTS[number]
type VerticalPosition = typeof VERTICAL_POSITIONS[number]

export default function ImageGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [text, setText] = useState('Your text here')
  const [fontSize, setFontSize] = useState(48)
  const [logoOption, setLogoOption] = useState<LogoOption>('vercel-logotype')
  const [imageSize, setImageSize] = useState<ImageSize>('twitter')
  const [logo, setLogo] = useState<HTMLImageElement | null>(null)
  const [textAlign, setTextAlign] = useState<Alignment>('center')
  const [textVertical, setTextVertical] = useState<VerticalPosition>('middle')
  const [logoAlign, setLogoAlign] = useState<Alignment>('left')
  const [logoVertical, setLogoVertical] = useState<VerticalPosition>('top')

  useEffect(() => {
    const img = new Image()
    img.src = LOGO_OPTIONS[logoOption].src
    img.onload = () => setLogo(img)
    img.onerror = (e) => console.error('Error loading logo:', e)
  }, [logoOption])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !logo) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width: canvasWidth, height: canvasHeight } = IMAGE_SIZES[imageSize]

    canvas.width = canvasWidth
    canvas.height = canvasHeight

    // Background
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.font = `${fontSize}px "Geist", sans-serif`
    ctx.textAlign = textAlign
    ctx.textBaseline = 'middle'

    let textX = canvasWidth / 2
    if (textAlign === 'left') textX = fontSize
    if (textAlign === 'right') textX = canvasWidth - fontSize

    let textY = canvasHeight / 2
    if (textVertical === 'top') textY = fontSize
    if (textVertical === 'bottom') textY = canvasHeight - fontSize

    ctx.fillText(text, textX, textY)

    // Logo
    const logoWidth = logoOption === 'vercel-icon' ? canvasWidth * 0.1 : canvasWidth * 0.2
    const logoHeight = (logo.height / logo.width) * logoWidth

    let logoX = (canvasWidth - logoWidth) / 2
    if (logoAlign === 'left') logoX = 20
    if (logoAlign === 'right') logoX = canvasWidth - logoWidth - 20

    let logoY = canvasHeight - logoHeight - 20
    if (logoVertical === 'top') logoY = 20
    if (logoVertical === 'middle') logoY = (canvasHeight - logoHeight) / 2

    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight)
  }, [text, fontSize, logo, logoOption, imageSize, textAlign, textVertical, logoAlign, logoVertical])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `generated-image-${imageSize}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image Generator</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="text-input">Text</Label>
            <Input
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="font-size-input">Font Size</Label>
            <Input
              id="font-size-input"
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="logo-select">Logo</Label>
            <Select value={logoOption} onValueChange={(value: LogoOption) => setLogoOption(value)}>
              <SelectTrigger id="logo-select">
                <SelectValue placeholder="Select a logo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOGO_OPTIONS).map(([key, { alt }]) => (
                  <SelectItem key={key} value={key}>{alt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="size-select">Image Size</Label>
            <Select value={imageSize} onValueChange={(value: ImageSize) => setImageSize(value)}>
              <SelectTrigger id="size-select">
                <SelectValue placeholder="Select image size" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(IMAGE_SIZES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="text-align">Text Alignment</Label>
            <Select value={textAlign} onValueChange={(value: Alignment) => setTextAlign(value)}>
              <SelectTrigger id="text-align">
                <SelectValue placeholder="Select text alignment" />
              </SelectTrigger>
              <SelectContent>
                {ALIGNMENTS.map((align) => (
                  <SelectItem key={align} value={align}>{align}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="text-vertical">Text Vertical Position</Label>
            <Select value={textVertical} onValueChange={(value: VerticalPosition) => setTextVertical(value)}>
              <SelectTrigger id="text-vertical">
                <SelectValue placeholder="Select text vertical position" />
              </SelectTrigger>
              <SelectContent>
                {VERTICAL_POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="logo-align">Logo Alignment</Label>
            <Select value={logoAlign} onValueChange={(value: Alignment) => setLogoAlign(value)}>
              <SelectTrigger id="logo-align">
                <SelectValue placeholder="Select logo alignment" />
              </SelectTrigger>
              <SelectContent>
                {ALIGNMENTS.map((align) => (
                  <SelectItem key={align} value={align}>{align}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="logo-vertical">Logo Vertical Position</Label>
            <Select value={logoVertical} onValueChange={(value: VerticalPosition) => setLogoVertical(value)}>
              <SelectTrigger id="logo-vertical">
                <SelectValue placeholder="Select logo vertical position" />
              </SelectTrigger>
              <SelectContent>
                {VERTICAL_POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDownload} className="w-full">Download Image</Button>
        </div>
        <div>
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-w-[600px] border border-gray-300"
          />
        </div>
      </div>
    </div>
  )
}