"use client"

import React, { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function QRCodeGenerator() {
  const [url, setUrl] = useState('https://vercel.com')
  const [size, setSize] = useState(256)
  const [iconSize, setIconSize] = useState(64)
  const qrRef = useRef<SVGSVGElement>(null)

  const VercelIcon = ({ size }: { size: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M256 48L496 464H16L256 48Z" fill="black" />
    </svg>
  )

  const downloadQRCode = () => {
    if (qrRef.current) {
      const canvas = document.createElement("canvas")
      const svg = qrRef.current
      const base64doc = btoa(unescape(encodeURIComponent(svg.outerHTML)))
      const w = parseInt(svg.getAttribute('width') || '0')
      const h = parseInt(svg.getAttribute('height') || '0')
      const img_to_download = document.createElement('img')
      img_to_download.src = 'data:image/svg+xml;base64,' + base64doc
      console.log(w, h)
      img_to_download.onload = function () {
        console.log('img loaded')
        canvas.setAttribute('width', w.toString())
        canvas.setAttribute('height', h.toString())
        const context = canvas.getContext('2d')
        if (context) {
          context.drawImage(img_to_download, 0, 0, w, h)
          const dataURL = canvas.toDataURL('image/png')
          const a = document.createElement('a')
          a.download = 'qr-code.png'
          a.href = dataURL
          a.click()
        }
      }
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Vercel QR Code Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="size">QR Code Size</Label>
          <Input
            id="size"
            type="number"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            min="128"
            max="512"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="iconSize">Icon Size</Label>
          <Input
            id="iconSize"
            type="number"
            value={iconSize}
            onChange={(e) => setIconSize(Number(e.target.value))}
            min="32"
            max="128"
          />
        </div>
        <div className="flex justify-center">
          <QRCodeSVG
            ref={qrRef}
            value={url}
            size={size}
            level="H"
            imageSettings={{
              src: `data:image/svg+xml;base64,${btoa(
                `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M256 48L496 464H16L256 48Z" fill="black" />
                </svg>`
              )}`,
              width: iconSize,
              height: iconSize,
              excavate: true,
            }}
          />
        </div>
        <Button onClick={downloadQRCode}>
          Download QR Code
        </Button>
      </CardContent>
    </Card>
  )
}