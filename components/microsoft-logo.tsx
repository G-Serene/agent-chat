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
      <rect x="1" y="1" width="10" height="10" fill="#FF4444"/>
      <rect x="13" y="1" width="10" height="10" fill="#00DD00"/>
      <rect x="1" y="13" width="10" height="10" fill="#0099FF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFD700"/>
    </svg>
  )
}
