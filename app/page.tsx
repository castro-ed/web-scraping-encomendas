'use client';

import { useState } from 'react';
import { Encomenda, ScrapingResponse } from './types';
import SearchForm from './components/SearchForm';
import EncomendaTable from './components/EncomendaTable';
import EncomendaDetails from './components/EncomendaDetails';
import LoadingSpinner from './components/LoadingSpinner';

export default function Home() {
  // Estado para armazenar o CPF do usuário
  const [cpf, setCpf] = useState<string>('');

  // Estado para armazenar as encomendas retornadas pela API
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);

  // Estado para controlar o carregamento da requisição
  const [loading, setLoading] = useState<boolean>(false);

  // Estado para armazenar possíveis erros durante a requisição
  const [error, setError] = useState<string>('');

  // Estado para armazenar a encomenda selecionada ao clicar em "Detalhes"
  const [selectedEncomenda, setSelectedEncomenda] = useState<Encomenda | null>(null);

  // Estado para controlar a visibilidade dos detalhes de uma encomenda
  const [isDetailsVisible, setIsDetailsVisible] = useState<boolean>(false);

  // Função que é chamada ao clicar no botão "Rastrear"
  const handleRastrear = async (): Promise<void> => {
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
      const data: ScrapingResponse = await res.json();

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
    } catch {
      // Caso ocorra um erro na requisição (exemplo: servidor fora do ar), exibe a mensagem de erro
      setError('Erro ao realizar rastreamento');
    } finally {
      // Finaliza o estado de carregamento
      setLoading(false);
    }
  };

  // Função chamada ao clicar em "Mais detalhes" de uma encomenda
  const handleShowDetails = (encomenda: Encomenda): void => {
    setSelectedEncomenda(encomenda);
    setIsDetailsVisible(true);  // Exibe os detalhes da encomenda
  };

  // Função chamada ao clicar em "Voltar à lista"
  const handleBackToList = (): void => {
    setIsDetailsVisible(false);
    setSelectedEncomenda(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-roxo to-roxoEscuro text-white">
      <div className="container mx-auto p-6 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-center mb-8">Rastrear Encomendas</h1>

        {/* Exibe a tela de entrada de CPF ou a tela de detalhes dependendo do estado de 'isDetailsVisible' */}
        {!isDetailsVisible ? (
          <SearchForm
            cpf={cpf}
            onCpfChange={setCpf}
            onSubmit={handleRastrear}
          />
        ) : (
          selectedEncomenda && (
            <EncomendaDetails
              encomenda={selectedEncomenda}
              onBack={handleBackToList}
            />
          )
        )}

        {/* Exibe o carregamento e os resultados de encomendas */}
        {!isDetailsVisible && (
          <>
            {/* Indicador de carregamento */}
            {loading && <LoadingSpinner />}

            {/* Exibe a mensagem de erro se houver algum problema na requisição */}
            {error && <div className="mt-6 text-center text-red-400">{error}</div>}

            {/* Exibe a lista de encomendas */}
            {encomendas.length > 0 && (
              <EncomendaTable
                encomendas={encomendas}
                onShowDetails={handleShowDetails}
              />
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
