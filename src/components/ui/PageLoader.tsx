import React from 'react'

export default function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a3a2a]">
      <div className="w-16 h-16 border-4 border-[#3d6b4a] border-t-[#4caf50] rounded-full animate-spin mb-4"></div>
      <p className="text-[#a5d6a7] font-medium text-lg">Loading...</p>
    </div>
  )
}
