"use client";

interface TransactionRowProps {
  transaction: {
    description: string;
    date: string;
    incoming: number | null;
    outgoing: number | null;
    amount: number;
    reference: string;
    currency: string;
  };
  checked: boolean;
  businessProfileId: string;
  clientId: string;
  businessProfiles: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; name: string }>;
  onCheckChange: (_checked: boolean) => void;
  onBusinessProfileChange: (_id: string) => void;
  onClientChange: (_id: string) => void;
}

export default function TransactionRow({
  transaction,
  checked,
  businessProfileId,
  clientId,
  businessProfiles,
  clients,
  onCheckChange,
  onBusinessProfileChange,
  onClientChange,
}: TransactionRowProps) {
  const isIncoming = transaction.incoming !== null;
  const amountValue = isIncoming ? transaction.incoming : transaction.outgoing;
  const amountColor = isIncoming ? "text-green-600" : "text-red-600";
  const amountPrefix = isIncoming ? "+" : "-";

  return (
    <tr className={checked ? "bg-blue-50" : ""}>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {transaction.date}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="max-w-xs truncate" title={transaction.description}>
          {transaction.description}
        </div>
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${amountColor}`}>
        {amountPrefix}
        {amountValue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
        {transaction.currency}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={businessProfileId}
          onChange={(e) => onBusinessProfileChange(e.target.value)}
          disabled={!checked}
          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
        >
          <option value="">Select business profile</option>
          {businessProfiles.map((bp) => (
            <option key={bp.id} value={bp.id}>
              {bp.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={clientId}
          onChange={(e) => onClientChange(e.target.value)}
          disabled={!checked}
          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
        >
          <option value="">Select client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}
