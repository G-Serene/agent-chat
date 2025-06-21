"use client"

import type { Message } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Code, FileText, BarChart3, Copy, Download, Check } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useState } from "react"
import mermaid from "mermaid"
import { useEffect, useRef } from "react"

interface ArtifactsPanelProps {
  messages: Message[]
  onClose: () => void
}

interface CodeBlock {
  id: string
  language: string
  code: string
  title?: string
}

interface DiagramBlock {
  id: string
  type: "mermaid"
  content: string
  title?: string
}

interface DataBlock {
  id: string
  type: "json" | "xml" | "csv" | "yaml"
  content: string
  title?: string
}

export function ArtifactsPanel({ messages, onClose }: ArtifactsPanelProps) {
  const [copied, setCopied] = useState<string | null>(null)

  // Extract artifacts from messages
  const extractArtifacts = () => {
    const codeBlocks: CodeBlock[] = []
    const diagrams: DiagramBlock[] = []
    const dataBlocks: DataBlock[] = []

    messages.forEach((message, messageIndex) => {
      if (message.content && typeof message.content === "string") {
        // Extract code blocks
        const codeRegex = /```(\w+)?\n?([\s\S]*?)```/g
        let match
        let blockIndex = 0

        while ((match = codeRegex.exec(message.content)) !== null) {
          const language = match[1] || "text"
          const code = match[2].trim()

          if (language === "mermaid") {
            diagrams.push({
              id: `diagram-${messageIndex}-${blockIndex}`,
              type: "mermaid",
              content: code,
              title: `Diagram ${diagrams.length + 1}`,
            })
          } else if (["json", "xml", "csv", "yaml"].includes(language)) {
            dataBlocks.push({
              id: `data-${messageIndex}-${blockIndex}`,
              type: language as "json" | "xml" | "csv" | "yaml",
              content: code,
              title: `${language.toUpperCase()} Data ${dataBlocks.length + 1}`,
            })
          } else {
            codeBlocks.push({
              id: `code-${messageIndex}-${blockIndex}`,
              language,
              code,
              title: `${language} Code ${codeBlocks.length + 1}`,
            })
          }
          blockIndex++
        }
      }
    })

    return { codeBlocks, diagrams, dataBlocks }
  }

  const { codeBlocks, diagrams, dataBlocks } = extractArtifacts()
  const totalArtifacts = codeBlocks.length + diagrams.length + dataBlocks.length

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopied(id)
        toast.success("Copied to clipboard!")
        setTimeout(() => setCopied(null), 2000)
      })
      .catch((err) => {
        toast.error("Failed to copy.")
      })
  }

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${filename}`)
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Artifacts</h2>
          {totalArtifacts > 0 && (
            <Badge variant="secondary" className="ml-2 text-sm px-2 py-0.5">
              {totalArtifacts}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {totalArtifacts === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <FileText className="w-16 h-16 text-slate-300 mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Artifacts Yet</h3>
              <p className="text-base text-muted-foreground max-w-xs">
                When agents generate code, diagrams, or structured data, they'll appear here automatically.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="code" className="flex items-center gap-1">
                  <Code className="w-4 h-4" />
                  Code ({codeBlocks.length})
                </TabsTrigger>
                <TabsTrigger value="diagrams" className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  Diagrams ({diagrams.length})
                </TabsTrigger>
                <TabsTrigger value="data" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Data ({dataBlocks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="space-y-4 mt-4">
                <AnimatePresence>
                  {codeBlocks.map((block) => (
                    <motion.div
                      key={block.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <Card className="bg-card shadow-lg border-slate-200 overflow-hidden">
                        <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                              <Code className="w-5 h-5 text-red-500" />
                              {block.title}
                            </CardTitle>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCopy(block.code, block.id)}
                              >
                                {copied === block.id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4 text-slate-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(block.code, `code.${block.language}`)}
                              >
                                <Download className="w-4 h-4 text-slate-500" />
                              </Button>
                            </div>
                          </div>
                          <Badge variant="outline" className="w-fit">
                            {block.language}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                          <SyntaxHighlighter
                            style={oneDark}
                            language={block.language}
                            PreTag="div"
                            className="!m-0 !rounded-none"
                          >
                            {block.code}
                          </SyntaxHighlighter>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="diagrams" className="space-y-4 mt-4">
                <AnimatePresence>
                  {diagrams.map((diagram) => (
                    <motion.div
                      key={diagram.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <Card className="bg-card shadow-lg border-slate-200 overflow-hidden">
                        <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                              <BarChart3 className="w-5 h-5 text-green-500" />
                              {diagram.title}
                            </CardTitle>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCopy(diagram.content, diagram.id)}
                              >
                                {copied === diagram.id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4 text-slate-500" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <Badge variant="outline" className="w-fit">
                            Mermaid
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-4">
                          <MermaidDiagram content={diagram.content} />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="data" className="space-y-4 mt-4">
                <AnimatePresence>
                  {dataBlocks.map((block) => (
                    <motion.div
                      key={block.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <Card className="bg-card shadow-lg border-slate-200 overflow-hidden">
                        <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                              <FileText className="w-5 h-5 text-purple-500" />
                              {block.title}
                            </CardTitle>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCopy(block.content, block.id)}
                              >
                                {copied === block.id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4 text-slate-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(block.content, `data.${block.type}`)}
                              >
                                <Download className="w-4 h-4 text-slate-500" />
                              </Button>
                            </div>
                          </div>
                          <Badge variant="outline" className="w-fit">
                            {block.type.toUpperCase()}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                          <SyntaxHighlighter
                            style={oneDark}
                            language={block.type}
                            PreTag="div"
                            className="!m-0 !rounded-none"
                          >
                            {block.content}
                          </SyntaxHighlighter>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Mermaid diagram component
function MermaidDiagram({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({ startOnLoad: true, theme: "default" })
      mermaid
        .render("mermaid-diagram", content)
        .then((result) => {
          if (ref.current) {
            ref.current.innerHTML = result.svg
          }
        })
        .catch((error) => {
          console.error("Mermaid rendering error:", error)
          if (ref.current) {
            ref.current.innerHTML = `<pre class="text-red-500 text-sm">${content}</pre>`
          }
        })
    }
  }, [content])

  return <div ref={ref} className="mermaid-container" />
}
