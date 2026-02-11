'use client'

import { useRef, useState } from 'react'

interface PdfUploadZoneProps {
  onFileSelected: (_file: File) => void
  isUploading: boolean
  error: string | null
}

export default function PdfUploadZone({
  onFileSelected,
  isUploading,
  error,
}: PdfUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.')
      return false
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('File size must be less than 5MB.')
      return false
    }

    return true
  }

  const handleFileChange = (file: File | null) => {
    if (!file) return

    if (validateFile(file)) {
      onFileSelected(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isUploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (isUploading) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileChange(files[0])
    }
  }

  const handleClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileChange(files[0])
    }
    // Reset input value to allow uploading the same file again
    e.target.value = ''
  }

  return (
    <div>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center gap-4">
          {/* Cloud upload icon */}
          <svg
            className={`w-12 h-12 ${
              isDragging ? 'text-blue-500' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {isUploading ? (
            <p className="text-sm text-gray-600 font-medium">Parsing PDF...</p>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF only (max 5MB)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-3 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
