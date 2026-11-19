/// <reference types="vite/client" />

declare module '*.jsx' {
  import type { ComponentType } from 'react'

  const component: ComponentType<{
    iconSize?: number
    className?: string
    light?: boolean
  }>

  export default component
}
