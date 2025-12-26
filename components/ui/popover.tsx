'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined)

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Popover = ({ open: controlledOpen, onOpenChange, children }: PopoverProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    },
    [isControlled, onOpenChange]
  )

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ asChild, children }, ref) => {
    const context = React.useContext(PopoverContext)
    if (!context) throw new Error('PopoverTrigger must be used within a Popover')

    const handleClick = () => {
      context.setOpen(!context.open)
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: handleClick,
        ref,
      })
    }

    return (
      <button ref={ref} onClick={handleClick} type="button">
        {children}
      </button>
    )
  }
)
PopoverTrigger.displayName = 'PopoverTrigger'

interface PopoverContentProps {
  align?: 'start' | 'center' | 'end'
  className?: string
  children: React.ReactNode
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ align = 'center', className, children }, ref) => {
    const context = React.useContext(PopoverContext)
    if (!context) throw new Error('PopoverContent must be used within a Popover')

    const popoverRef = React.useRef<HTMLDivElement>(null)

    // Close when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
          const trigger = popoverRef.current.parentElement?.querySelector('button')
          if (trigger && !trigger.contains(event.target as Node)) {
            context.setOpen(false)
          }
        }
      }

      if (context.open) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [context.open, context])

    if (!context.open) return null

    return (
      <div
        ref={popoverRef}
        className={cn(
          'absolute z-50 mt-2 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
          align === 'start' && 'left-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'end' && 'right-0',
          className
        )}
      >
        {children}
      </div>
    )
  }
)
PopoverContent.displayName = 'PopoverContent'

export { Popover, PopoverTrigger, PopoverContent }
