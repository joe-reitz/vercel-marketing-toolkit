'use client'

import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function QRCodeGenerator() {
  const [url, setUrl] = useState('https://vercel.com')
  const [size, setSize] = useState(256)
  const [iconSize, setIconSize] = useState(64)

  return (
    <Card className="w-full max-w-md mx-auto border-none shadow-none">
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
        <div className="flex justify-center">
          <Button
            className="bg-blue-500 text-white"
            onClick={() => {
              const svg = document.querySelector('svg')
              if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg)
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                const img = new Image()
                img.onload = () => {
                  canvas.width = size
                  canvas.height = size
                  ctx?.drawImage(img, 0, 0)
                  const pngFile = canvas.toDataURL('image/png')
                  const downloadLink = document.createElement('a')
                  downloadLink.download = 'vercel-qr-code.png'
                  downloadLink.href = pngFile
                  downloadLink.click()
                }
                img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
              }
            }}
          >
            Download QR Code
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}