'use client';

import { Encomenda } from '../types';

interface EncomendaDetailsProps {
  encomenda: Encomenda;
  onBack: () => void;
}

export default function EncomendaDetails({ encomenda, onBack }: EncomendaDetailsProps) {
  return (
    <div className="details-container">
      <h3>Detalhes da Encomenda</h3>
      <p><strong>Número:</strong> {encomenda.numero}</p>
      <p><strong>Local e Data:</strong> {encomenda.data}</p>
      <p><strong>Status:</strong> {encomenda.status}</p>
      <p><strong>Comentários:</strong> {encomenda.comentarios || 'Sem comentários adicionais.'}</p>
      <button onClick={onBack}>Voltar à lista</button>
    </div>
  );
}
