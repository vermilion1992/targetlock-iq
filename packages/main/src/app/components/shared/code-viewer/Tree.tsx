import { useState } from "react"
import { FileNode } from "./CodeExplorer"
import { Icon } from "@iconify/react"

export const Tree = ({
  node,
  level,
  activePath,
  onSelect,
}: {
  node: FileNode
  level: number
  activePath: string | null
  onSelect: (path: string) => void
}) => {
  const [open, setOpen] = useState(true)
  const isFile = !node.children
  const isActive = node.path === activePath

  return (
    <div>
      <button
        onClick={() => {
          if (isFile && node.path) onSelect(node.path)
          else setOpen(!open)
        }}
        style={{ paddingLeft: `${level * 16}px` }}
        className={`flex items-center gap-2.5 text-[13px] py-1.5 w-full text-left transition-all duration-200 group ${
          isActive
            ? 'bg-primary/15! text-primary! font-bold rounded-lg'
            : 'text-white/70 hover:text-white dark:hover:text-primary transition-colors'
        }`}
      >
        <span className="shrink-0 flex items-center justify-center">
          {isFile ? (
            <Icon 
              icon="solar:file-text-linear" 
              className={`size-[18px] ${isActive ? 'text-primary' : 'text-white/40'}`} 
            />
          ) : (
            <Icon 
              icon={open ? "solar:folder-open-bold" : "solar:folder-bold"} 
              className="size-[18px] text-white/50" 
            />
          )}
        </span>
        <span className={`truncate font-semibold ${!isFile && 'text-white/90'}`}>
          {node.name}
        </span>
      </button>

      {!isFile && open && node.children && (
        <div className="">
          {node.children.map((child, i) => (
            <Tree
              key={i}
              node={child}
              level={level + 1}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}