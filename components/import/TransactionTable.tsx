"use client";

import TransactionRow from "./TransactionRow";

interface Transaction {
  description: string;
  date: string;
  incoming: number | null;
  outgoing: number | null;
  amount: number;
  reference: string;
  currency: string;
}

interface RowState {
  checked: boolean;
  businessProfileId: string;
  clientId: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  rowStates: RowState[];
  businessProfiles: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; name: string }>;
  onRowStateChange: (index: number, state: Partial<RowState>) => void;
  onToggleAll: (checked: boolean) => void;
}

export default function TransactionTable({
  transactions,
  rowStates,
  businessProfiles,
  clients,
  onRowStateChange,
  onToggleAll,
}: TransactionTableProps) {
  const allChecked = rowStates.length > 0 && rowStates.every((state) => state.checked);
  const someChecked = rowStates.some((state) => state.checked);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked && !allChecked;
                }}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Business Profile
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((tx, index) => (
            <TransactionRow
              key={tx.reference}
              transaction={tx}
              checked={rowStates[index]?.checked || false}
              businessProfileId={rowStates[index]?.businessProfileId || ""}
              clientId={rowStates[index]?.clientId || ""}
              businessProfiles={businessProfiles}
              clients={clients}
              onCheckChange={(checked) =>
                onRowStateChange(index, { checked })
              }
              onBusinessProfileChange={(id) =>
                onRowStateChange(index, { businessProfileId: id })
              }
              onClientChange={(id) =>
                onRowStateChange(index, { clientId: id })
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
