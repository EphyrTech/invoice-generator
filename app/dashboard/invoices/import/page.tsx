'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PdfUploadZone from '@/components/import/PdfUploadZone'
import TransactionTable from '@/components/import/TransactionTable'
import ImportActionBar from '@/components/import/ImportActionBar'

interface WiseTransaction {
  description: string
  date: string
  incoming: number | null
  outgoing: number | null
  amount: number
  reference: string
  currency: string
}

interface BusinessProfile {
  id: string
  name: string
}

interface Client {
  id: string
  name: string
}

interface RowState {
  checked: boolean
  businessProfileId: string
  clientId: string
}

export default function WiseImportPage() {
  const router = useRouter()

  const [transactions, setTransactions] = useState<WiseTransaction[]>([])
  const [rowStates, setRowStates] = useState<RowState[]>([])
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [profilesRes, clientsRes] = await Promise.all([
          fetch('/api/business-profiles'),
          fetch('/api/clients'),
        ])

        if (profilesRes.ok) {
          const profilesData = await profilesRes.json()
          setBusinessProfiles(profilesData)
        }

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json()
          setClients(clientsData)
        }
      } catch (error) {
        console.error('Failed to fetch business profiles and clients:', error)
      }
    }

    fetchData()
  }, [])

  async function handleFileSelected(file: File) {
    setIsUploading(true)
    setUploadError(null)
    setTransactions([])
    setRowStates([])
    setGenerateError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/wise/parse', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse PDF')
      }

      const data = await response.json()
      setTransactions(data.transactions)
      setRowStates(
        data.transactions.map(() => ({
          checked: false,
          businessProfileId: '',
          clientId: '',
        }))
      )
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to parse PDF')
    } finally {
      setIsUploading(false)
    }
  }

  function handleRowStateChange(index: number, partial: Partial<RowState>) {
    setRowStates((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...partial }
      return next
    })
  }

  function handleToggleAll(checked: boolean) {
    setRowStates((prev) => prev.map((state) => ({ ...state, checked })))
  }

  const canGenerate = rowStates.some(
    (state) =>
      state.checked && state.businessProfileId !== '' && state.clientId !== ''
  )

  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)

    try {
      const selectedRows = transactions
        .map((transaction, index) => ({
          transaction,
          state: rowStates[index],
        }))
        .filter(({ state }) => state.checked)

      const requestBody = {
        invoices: selectedRows.map(({ transaction, state }) => ({
          businessProfileId: state.businessProfileId,
          clientId: state.clientId,
          transaction: {
            description: transaction.description,
            date: transaction.date,
            incoming: transaction.incoming,
            outgoing: transaction.outgoing,
            amount: transaction.amount,
            reference: transaction.reference,
            currency: transaction.currency,
          },
        })),
      }

      const response = await fetch('/api/import/wise/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate invoices')
      }

      router.push('/dashboard/invoices')
      router.refresh()
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : 'Failed to generate invoices'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Import from Wise</h1>
        <Link
          href="/dashboard/invoices"
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Invoices
        </Link>
      </div>

      <PdfUploadZone
        onFileSelected={handleFileSelected}
        isUploading={isUploading}
        error={uploadError}
      />

      {transactions.length > 0 && (
        <>
          <div className="mt-6">
            <TransactionTable
              transactions={transactions}
              rowStates={rowStates}
              businessProfiles={businessProfiles}
              clients={clients}
              onRowStateChange={handleRowStateChange}
              onToggleAll={handleToggleAll}
            />
          </div>

          {generateError && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-3">
              <p className="text-sm text-red-700">{generateError}</p>
            </div>
          )}

          <ImportActionBar
            canGenerate={canGenerate}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            selectedCount={rowStates.filter((s) => s.checked).length}
            totalCount={transactions.length}
          />
        </>
      )}
    </div>
  )
}
