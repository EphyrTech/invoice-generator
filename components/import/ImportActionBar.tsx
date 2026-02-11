'use client'

interface ImportActionBarProps {
  selectedCount: number
  totalCount: number
  canGenerate: boolean
  isGenerating: boolean
  onGenerate: () => void
}

export default function ImportActionBar({
  selectedCount,
  totalCount,
  canGenerate,
  isGenerating,
  onGenerate,
}: ImportActionBarProps) {
  const isDisabled = !canGenerate || isGenerating
  const buttonText = isGenerating
    ? 'Generating...'
    : `Generate ${selectedCount} Invoice${selectedCount !== 1 ? 's' : ''}`

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {selectedCount} of {totalCount} transactions selected
        </p>

        <button
          onClick={onGenerate}
          disabled={isDisabled}
          className={`px-6 py-2 rounded-md text-sm font-medium ${
            isDisabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
