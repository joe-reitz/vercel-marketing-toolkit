'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SOQLQueryHelper() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const inputArray = input.split(/\r?\n/).filter(item => item.trim() !== '')
    const formattedOutput = inputArray.length ? `'${inputArray.join("','")}'` : ''
    setOutput(formattedOutput)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output).then(() => {
      alert('Copied to clipboard!')
    }, (err) => {
      console.error('Could not copy text: ', err)
    })
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>SOQL Query Helper</CardTitle>
          <CardDescription>
            Paste a list of values (each on a new line) and get them formatted for use in a SOQL query.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Paste your list here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={10}
            />
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" type="submit">Format for SOQL</Button>
          </form>
          {output && (
            <div className="mt-4 space-y-4">
              <Textarea
                value={output}
                readOnly
                rows={5}
              />
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={copyToClipboard}>Copy to Clipboard</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

