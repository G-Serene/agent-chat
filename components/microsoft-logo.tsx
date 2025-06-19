"use client"

import { SVGProps } from "react"

interface MicrosoftLogoProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export function MicrosoftLogo({ size = 24, className, ...props }: MicrosoftLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect x="1" y="1" width="10" height="10" fill="#ef4444" stroke="currentColor" strokeWidth="0.5"/>
      <rect x="13" y="1" width="10" height="10" fill="currentColor"/>
      <rect x="1" y="13" width="10" height="10" fill="currentColor"/>
      <rect x="13" y="13" width="10" height="10" fill="#ef4444" stroke="currentColor" strokeWidth="0.5"/>
    </svg>
  )
}
