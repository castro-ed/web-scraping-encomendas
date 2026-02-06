import puppeteer, { Browser, Page } from 'puppeteer-core';
import { NextRequest } from 'next/server';
import { Encomenda } from '../../types';

// Cache simples na memória (armazenando os resultados por 5 minutos)
interface CacheEntry {
  data: Encomenda[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// Tipagem para a resposta da API
interface ApiResponse {
  status?: string;
  data?: Encomenda[];
  message?: string;
  error?: string;
  details?: string;
}

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get('cpf');

  // Validação do CPF: Verifica se foi passado na requisição
  if (!cpf) {
    const response: ApiResponse = { error: 'CPF é necessário' };
    return new Response(JSON.stringify(response), { status: 400 });
  }

  // Validação adicional para garantir que o CPF tenha 11 dígitos
  if (!/^\d{11}$/.test(cpf)) {
    const response: ApiResponse = { error: 'CPF inválido. Deve conter 11 dígitos.' };
    return new Response(JSON.stringify(response), { status: 400 });
  }

  // Verifica se o CPF já está armazenado no cache e se os dados são válidos
  if (cache.has(cpf)) {
    const cachedData = cache.get(cpf)!;
    const currentTime = Date.now();

    // Verifica se os dados no cache ainda são válidos (5 minutos)
    if (currentTime - cachedData.timestamp < 5 * 60 * 1000) {
      const response: ApiResponse = { status: 'sucesso', data: cachedData.data };
      return new Response(JSON.stringify(response), { status: 200 });
    }
  }

  let browser: Browser | null = null;

  try {
    console.log("Acessando a página de rastreamento...");

    if (process.env.VERCEL) {
      // Em produção (Vercel): conectar ao Browserless.io
      const browserlessToken = process.env.BROWSERLESS_TOKEN;
      if (!browserlessToken) {
        throw new Error('BROWSERLESS_TOKEN não configurado nas variáveis de ambiente');
      }
      
      browser = await puppeteer.connect({
        browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`,
      });
    } else {
      // Em desenvolvimento local: usar Chrome instalado
      browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page: Page = await browser.newPage();

    await page.goto('https://ssw.inf.br/2/rastreamento_pf?#', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    console.log("Aguardando o campo de CPF...");
    await page.waitForSelector('#cnpjdest', { timeout: 10000 });
    console.log("Campo de CPF encontrado!");

    await page.type('#cnpjdest', cpf);
    console.log("CPF preenchido!");

    await page.click('#btn_rastrear');
    console.log("Botão 'Rastrear' clicado!");

    const tableSelector = 'table tbody';

    try {
      await page.waitForSelector(tableSelector, { timeout: 30000 });
    } catch {
      console.error("Erro ao realizar scraping: Timeout ou falha ao encontrar a tabela.");
      await browser.close();
      const response: ApiResponse = { error: 'Erro ao realizar scraping. Tabela não encontrada.' };
      return new Response(JSON.stringify(response), { status: 500 });
    }

    await page.waitForFunction(
      'document.querySelector("table tbody tr") !== null',
      { timeout: 30000 }
    );

    console.log("Tabela de resultados carregada com sucesso!");

    // Realiza a extração dos dados da tabela
    const encomendas: Encomenda[] = await page.evaluate(() => {
      const encomendasList: { numero: string; data: string; status: string }[] = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const encomenda = {
            numero: cells[0] ? cells[0].textContent?.trim() || 'Não disponível' : 'Não disponível',
            data: cells[1] ? cells[1].textContent?.trim() || 'Não disponível' : 'Não disponível',
            status: cells[2] ? cells[2].textContent?.trim() || 'Não disponível' : 'Não disponível',
          };
          encomendasList.push(encomenda);
        }
      });

      return encomendasList;
    });

    await browser.close();

    // Armazenando os resultados no cache com o timestamp
    cache.set(cpf, { data: encomendas, timestamp: Date.now() });

    // Caso não haja encomendas, retorna erro 404
    if (encomendas.length === 0) {
      const response: ApiResponse = { error: 'Nenhuma encomenda encontrada para este CPF.' };
      return new Response(JSON.stringify(response), { status: 404 });
    }

    // Retorna os dados extraídos com sucesso
    const response: ApiResponse = { 
      status: 'sucesso', 
      data: encomendas, 
      message: 'Encomendas extraídas com sucesso!' 
    };
    return new Response(JSON.stringify(response), { status: 200 });

  } catch (error) {
    // Captura e loga qualquer erro ocorrido durante o processo
    console.error('Erro ao realizar scraping:', error);
    
    if (browser) {
      await browser.close();
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const response: ApiResponse = { 
      error: 'Erro ao realizar scraping. Tente novamente mais tarde.', 
      details: errorMessage 
    };
    return new Response(JSON.stringify(response), { status: 500 });
  }
}
