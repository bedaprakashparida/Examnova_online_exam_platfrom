import React from 'react'

export default function LogoIcon({ className = "w-9 h-9" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Green/teal rounded background */}
      <rect width="100" height="100" rx="28" fill="#10b981" />
      
      {/* White Graduation Cap Icon */}
      <path 
        d="M18 43L50 26L82 43L50 60L18 43Z" 
        stroke="white" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M33 51V62C33 69 67 69 67 62V51" 
        stroke="white" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M48 44.5L34 50V68" 
        stroke="white" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle cx="34" cy="71" r="3" fill="white" />
    </svg>
  )
}
