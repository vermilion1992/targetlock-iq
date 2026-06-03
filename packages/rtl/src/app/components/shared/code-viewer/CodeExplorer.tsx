'use client'

import React, { Fragment, useEffect, useMemo, useState } from 'react'
import { Check, ClipboardCopy, MenuIcon } from 'lucide-react'
import type { BundledLanguage } from 'shiki/bundle/web'
import { codeToHast } from 'shiki/bundle/web'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { jsx, jsxs } from 'react/jsx-runtime'
import { Tree } from './Tree'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger, 
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import SimpleBar from 'simplebar-react';
import { Icon } from '@iconify/react'
import { copyToClipboard } from '@/lib/utils'


export type FileNode = {
  name: string
  path?: string
  children?: FileNode[]
}

type FileData = {
  path: string
  content: string
}

type Props = {
  files: FileData[]
  forceTargetRoot?: boolean
  command?: string
  hideSidebarCommand?: boolean
}

const buildFileTree = (files: FileData[]): FileNode[] => {
  const root: FileNode[] = []

  for (const file of files) {
    const parts = file.path.split('/')
    let currentLevel = root

    parts.forEach((part, index) => {
      const existing = currentLevel.find((n) => n.name === part)

      if (existing) {
        currentLevel = existing.children = existing.children || []
      } else {
        const newNode: FileNode = {
          name: part,
          ...(index === parts.length - 1 ? { path: file.path } : { children: [] }),
        }
        currentLevel.push(newNode)
        if (newNode.children) currentLevel = newNode.children
      }
    })
  }

  return root
}

const findFirstPath = (tree: FileNode[]): string | null => {
  for (const node of tree) {
    if (node.path) return node.path
    if (node.children) {
      const result = findFirstPath(node.children)
      if (result) return result
    }
  }
  return null
}

const highlightCode = async (code: string, lang: BundledLanguage) => {
  const out = await codeToHast(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
  })
  return toJsxRuntime(out, { jsx, jsxs, Fragment }) as React.ReactElement
}

const CodeBlock = ({ code, lang }: { code: string; lang: BundledLanguage }) => {
  const [highlighted, setHighlighted] = useState<React.ReactElement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const result = await highlightCode(code, lang)
      setHighlighted(result)
      setLoading(false)
    }
    run()
  }, [code, lang])

  if (loading) {
    return (
      <div className="flex h-full! min-h-[400px] items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6 text-[13px] leading-relaxed font-mono">
      <div className="[&_pre]:bg-transparent! [&_code]:font-mono">
        {highlighted}
      </div>
    </div>
  )
}

const CodeExplorer = ({ files, forceTargetRoot = false, command, hideSidebarCommand = false }: Props) => {
  const [activePath, setActivePath] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [lang, setLang] = useState<BundledLanguage>('tsx')
  const [open, setOpen] = useState(false)

  const tree = useMemo(() => buildFileTree(files), [files])

  useEffect(() => {
    if (!activePath) {
      const first = findFirstPath(tree)
      if (first) setActivePath(first)
      return
    }

    const selectedFile = files.find((f) => f.path === activePath)
    if (selectedFile) {
      setCode(selectedFile.content)
      setLang((selectedFile.path.split('.').pop() as BundledLanguage) || 'tsx')
    }
  }, [activePath, tree, files])

  if (!tree?.length) return null

  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(code)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] border border-white/10 rounded-xl overflow-hidden dark">
      <div className="flex lg:hidden items-center justify-between border-b border-white/10 px-4 py-3 bg-[#0A0A0A]">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger >
            <button className="flex items-center gap-2 text-sm text-white/70">
              <MenuIcon className="size-4" />
              Files
            </button>
          </DrawerTrigger>
          <DrawerContent className="p-4 bg-[#0A0A0A] border-white/10">
            <DrawerHeader>
              <DrawerTitle className="text-white/40 text-[11px] uppercase tracking-widest font-bold text-left">Files</DrawerTitle>
            </DrawerHeader>
            <SimpleBar className="mt-4 max-h-[60vh]">
              <div className="space-y-1">
                {tree.map((node, i) => (
                  <Tree
                    key={i}
                    node={node}
                    level={1}
                    activePath={activePath}
                    onSelect={(path) => {
                      setActivePath(path)
                      setOpen(false)
                    }}
                  />
                ))}
              </div>
            </SimpleBar>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="hidden lg:flex flex-col lg:w-72 border-r border-white/10 bg-[#0A0A0A] p-4">
        {command && !hideSidebarCommand && (
          <div className="mb-6">
            <div className="flex items-center gap-2 px-3 py-2 bg-black border border-white/15 rounded-lg text-[13px] font-mono text-white/90 group cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
              onClick={() => {
                copyToClipboard(`npx add ${command}`);
              }}>
              <span className="text-white/40 group-hover:text-primary transition-colors">{">_"}</span>
              <span className="truncate">npx add {command}</span>
            </div>
          </div>
        )}
        <h2 className="text-[11px] font-bold mb-4 text-white/30 px-2 uppercase tracking-[0.2em]">Files</h2>
        <SimpleBar className="flex-1 -mx-2 h-full">
          <div className="px-2">
            {tree.map((node, i) => (
              <Tree key={i} node={node} level={1} activePath={activePath} onSelect={setActivePath} />
            ))}
          </div>
        </SimpleBar>
      </div>

      <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
        <div className="border-b border-white/10 flex items-center justify-between px-6 py-3.5 text-sm text-white/60 bg-black sticky top-0 z-10">
          <div className="flex items-center gap-2.5 truncate font-mono text-[13px] text-white/80">
            <Icon icon="solar:file-code-bold-duotone" className="size-[18px] text-primary" />
            {activePath}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/5 transition-colors group"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="size-4 text-teal-500" />
            ) : (
              <ClipboardCopy className="size-4 opacity-50 group-hover:opacity-100" />
            )}
          </Button>
        </div>
        <SimpleBar className="flex-1 min-h-0 max-h-[537px]">
          <CodeBlock code={code} lang={lang} />
        </SimpleBar>
      </div>
    </div>
  )
}

export default CodeExplorer
