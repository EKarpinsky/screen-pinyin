import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import * as React from "react"

// CSS for ScrollArea - injected once
const scrollAreaStyles = `
  .ScrollAreaRoot {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  .ScrollAreaViewport {
    width: 100%;
    height: 100%;
    border-radius: inherit;
  }
  
  .ScrollAreaViewport > div {
    display: block !important;
  }
  
  .ScrollAreaScrollbar {
    display: flex;
    touch-action: none;
    user-select: none;
    transition: background 160ms ease-out;
    padding: 2px;
  }
  
  .ScrollAreaScrollbar[data-orientation="vertical"] {
    width: 10px;
  }
  
  .ScrollAreaScrollbar[data-orientation="horizontal"] {
    flex-direction: column;
    height: 10px;
  }
  
  .ScrollAreaThumb {
    flex: 1;
    background: var(--muted-foreground);
    opacity: 0.4;
    border-radius: 10px;
    position: relative;
    transition: opacity 160ms ease-out;
  }
  
  .ScrollAreaThumb:hover {
    opacity: 0.7;
  }
  
  .ScrollAreaThumb::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    min-width: 44px;
    min-height: 44px;
  }
`

// Inject styles once
let stylesInjected = false
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = scrollAreaStyles
  document.head.append(style)
  stylesInjected = true
}

interface ScrollAreaProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export function ScrollArea({ children, style, className }: ScrollAreaProps) {
  React.useEffect(() => {
    injectStyles()
  }, [])

  return (
    <ScrollAreaPrimitive.Root 
      className={`ScrollAreaRoot ${className || ''}`}
      style={style}
    >
      <ScrollAreaPrimitive.Viewport className="ScrollAreaViewport">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar 
        className="ScrollAreaScrollbar" 
        orientation="vertical"
      >
        <ScrollAreaPrimitive.Thumb className="ScrollAreaThumb" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Scrollbar 
        className="ScrollAreaScrollbar" 
        orientation="horizontal"
      >
        <ScrollAreaPrimitive.Thumb className="ScrollAreaThumb" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}




export * as ScrollBar from "@radix-ui/react-scroll-area"
