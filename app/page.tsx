'use client';

import { useState } from 'react';

export default function Home() {
  // Estado para armazenar o CPF do usuário
  const [cpf, setCpf] = useState('');

  // Estado para armazenar as encomendas retornadas pela API
  const [encomendas, setEncomendas] = useState<any[]>([]);

  // Estado para controlar o carregamento da requisição
  const [loading, setLoading] = useState(false);

  // Estado para armazenar possíveis erros durante a requisição
  const [error, setError] = useState<string>('');

  // Estado para armazenar a encomenda selecionada ao clicar em "Detalhes"
  const [selectedEncomenda, setSelectedEncomenda] = useState<any | null>(null);

  // Estado para controlar a visibilidade dos detalhes de uma encomenda
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  // Função que é chamada ao clicar no botão "Rastrear"
  const handleRastrear = async () => {
    // Validação do CPF - Verifica se o CPF tem 11 dígitos
    if (!/^\d{11}$/.test(cpf)) {
      setError('CPF inválido. Deve conter 11 dígitos.');
      return;
    }

    // Marca o início do carregamento
    setLoading(true);
    setError('');  // Limpa qualquer erro anterior
    try {
      // Realiza a requisição para a API que faz o scraping
      const res = await fetch(`/api/scraping?cpf=${cpf}`);
      const data = await res.json();

      if (res.ok) {
        // Se a requisição for bem-sucedida, verifica se há encomendas retornadas
        if (data.data && data.data.length > 0) {
          // Armazena as encomendas no estado
          setEncomendas(data.data);
        } else {
          setError('CPF válido, mas não foram encontradas encomendas para este CPF.');
        }
      } else {
        // Em caso de erro na requisição, exibe a mensagem de erro
        setError(data.error || 'Erro ao realizar rastreamento');
      }
    } catch (err) {
      // Caso ocorra um erro na requisição (exemplo: servidor fora do ar), exibe a mensagem de erro
      setError('Erro ao realizar rastreamento');
    } finally {
      // Finaliza o estado de carregamento
      setLoading(false);
    }
  };

  // Função chamada ao clicar em "Mais detalhes" de uma encomenda
  const handleShowDetails = (encomenda: any) => {
    setSelectedEncomenda(encomenda);
    setIsDetailsVisible(true);  // Exibe os detalhes da encomenda
  };

  // Função chamada ao clicar em "Voltar à lista"
  const handleBackToList = () => {
    setIsDetailsVisible(false);
    setSelectedEncomenda(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-roxo to-roxoEscuro text-white">
      <div className="container mx-auto p-6 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-center mb-8">Rastrear Encomendas</h1>

        {/* Exibe a tela de entrada de CPF ou a tela de detalhes dependendo do estado de 'isDetailsVisible' */}
        {!isDetailsVisible ? (
          <div className="flex justify-center items-center space-x-4">
            {/* Campo de input para o CPF */}
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="Digite o CPF (apenas números)"
              className="p-3 w-80 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-roxo transition duration-200"
            />
            <button
              onClick={handleRastrear} // Chama a função para rastrear as encomendas
              className="px-6 py-3 bg-roxo text-white rounded-lg hover:bg-roxoEscuro focus:outline-none transition duration-300 transform hover:scale-105"
            >
              Rastrear
            </button>
          </div>
        ) : (
          <div className="details-container">
            {/* Exibe os detalhes da encomenda selecionada */}
            <h3>Detalhes da Encomenda</h3>
            <p><strong>Número:</strong> {selectedEncomenda.numero}</p>
            <p><strong>Local e Data:</strong> {selectedEncomenda.data}</p>
            <p><strong>Status:</strong> {selectedEncomenda.status}</p>
            <p><strong>Comentários:</strong> {selectedEncomenda.comentarios || 'Sem comentários adicionais.'}</p>
            <button onClick={handleBackToList}>Voltar à lista</button>
          </div>
        )}

        {/* Exibe o carregamento e os resultados de encomendas */}
        {!isDetailsVisible && (
          <>
            {/* Indicador de carregamento */}
            {loading && (
              <div className="mt-8 text-center">
                <div className="w-8 h-8 border-4 border-t-4 border-roxo rounded-full animate-spin mx-auto"></div>
                <p className="mt-2">Carregando...</p> {/* Indicador de carregamento */}
              </div>
            )}

            {/* Exibe a mensagem de erro se houver algum problema na requisição */}
            {error && <div className="mt-6 text-center text-red-400">{error}</div>}

            {/* Exibe a lista de encomendas */}
            {encomendas.length > 0 && (
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
                    {/* Mapeia e exibe cada encomenda */}
                    {encomendas.map((encomenda, index) => (
                      <tr key={index} className="border-b transition duration-200">
                        <td className="px-6 py-4">{encomenda.numero}</td>
                        <td className="px-6 py-4">{encomenda.data}</td>
                        <td className="px-6 py-4">{encomenda.status}</td>
                        <td className="px-6 py-4">
                          {encomenda.numero && (
                            <button
                              onClick={() => handleShowDetails(encomenda)} // Chama a função para exibir os detalhes
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
            )}

            {/* Caso não haja encomendas para o CPF informado */}
            {encomendas.length === 0 && !loading && !error && (
              <div className="mt-6 text-center text-gray-300">Nenhuma encomenda encontrada</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
