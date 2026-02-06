'use client';

import { Encomenda } from '../types';

interface EncomendaTableProps {
  encomendas: Encomenda[];
  onShowDetails: (encomenda: Encomenda) => void;
}

export default function EncomendaTable({ encomendas, onShowDetails }: EncomendaTableProps) {
  return (
    <div className="mt-8 w-full bg-white text-black rounded-lg shadow-lg overflow-x-auto">
      <table className="min-w-full text-center">
        <thead className="bg-roxo text-white">
          <tr>
            <th className="px-6 py-3">Número</th>
            <th className="px-6 py-3">Data</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {encomendas.map((encomenda, index) => (
            <tr key={index} className="border-b transition duration-200">
              <td className="px-6 py-4">{encomenda.numero}</td>
              <td className="px-6 py-4">{encomenda.data}</td>
              <td className="px-6 py-4">{encomenda.status}</td>
              <td className="px-6 py-4">
                {encomenda.numero && (
                  <button
                    onClick={() => onShowDetails(encomenda)}
                    className="text-blue-500 hover:underline"
                  >
                    Mais detalhes
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
