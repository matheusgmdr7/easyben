"use client"

import type React from "react"

import { useEffect } from "react"

// Declaração de tipo para window.fbq
declare global {
  interface Window {
    fbq?: (...args: any[]) => void
  }
}

interface MetaPixelProps {
  pixelId: string
}

const MetaPixel: React.FC<MetaPixelProps> = ({ pixelId }) => {
  useEffect(() => {
    // Check if the Facebook Pixel script is already loaded
    if (!document.querySelector(`script[src="https://connect.facebook.net/en_US/fbevents.js"]`)) {
      // Create and append the Facebook Pixel script
      const script = document.createElement("script")
      script.src = "https://connect.facebook.net/en_US/fbevents.js"
      script.async = true
      document.head.appendChild(script)

      // Initialize the pixel once the script is loaded
      script.onload = () => {
        if (window.fbq) {
          window.fbq("init", pixelId)
          window.fbq("track", "PageView")
        }
      }
    } else {
      // If the script is already loaded, just initialize the pixel
      if (window.fbq) {
        window.fbq("init", pixelId)
        window.fbq("track", "PageView")
      }
    }

    // Add the <noscript> tag
    const noscript = document.createElement("noscript")
    const img = document.createElement("img")
    img.height = 1
    img.width = 1
    img.style.display = "none"
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`
    noscript.appendChild(img)
    document.body.appendChild(noscript)

    // Cleanup function to remove the elements when the component unmounts
    return () => {
      const scriptTag = document.querySelector(`script[src="https://connect.facebook.net/en_US/fbevents.js"]`)
      if (scriptTag) {
        scriptTag.remove()
      }
      noscript.remove()
    }
  }, [pixelId])

  return null
}

export default MetaPixel
