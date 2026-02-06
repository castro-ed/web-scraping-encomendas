'use client';

interface SearchFormProps {
  cpf: string;
  onCpfChange: (value: string) => void;
  onSubmit: () => void;
}

export default function SearchForm({ cpf, onCpfChange, onSubmit }: SearchFormProps) {
  return (
    <div className="flex justify-center items-center space-x-4">
      <input
        type="text"
        value={cpf}
        onChange={(e) => onCpfChange(e.target.value)}
        placeholder="Digite o CPF (apenas números)"
        className="p-3 w-80 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-roxo transition duration-200"
      />
      <button
        onClick={onSubmit}
        className="px-6 py-3 bg-roxo text-white rounded-lg hover:bg-roxoEscuro focus:outline-none transition duration-300 transform hover:scale-105"
      >
        Rastrear
      </button>
    </div>
  );
}
