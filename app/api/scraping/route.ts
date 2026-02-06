import puppeteer, { Browser, Page } from 'puppeteer-core';
import { NextRequest } from 'next/server';
import { Encomenda, ScrapingResponse, ScrapingSuccessResponse, ScrapingErrorResponse } from '../../types';

// Cache simples na memória (armazenando os resultados por 5 minutos)
interface CacheEntry {
  data: Encomenda[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get('cpf');

  // Validação do CPF: Verifica se foi passado na requisição
  if (!cpf) {
    const response: ScrapingErrorResponse = { error: 'CPF é necessário' };
    return new Response(JSON.stringify(response), { status: 400 });
  }

  // Validação adicional para garantir que o CPF tenha 11 dígitos
  if (!/^\d{11}$/.test(cpf)) {
    const response: ScrapingErrorResponse = { error: 'CPF inválido. Deve conter 11 dígitos.' };
    return new Response(JSON.stringify(response), { status: 400 });
  }

  // Verifica se o CPF já está armazenado no cache e se os dados são válidos
  if (cache.has(cpf)) {
    const cachedData = cache.get(cpf)!;
    const currentTime = Date.now();

    // Verifica se os dados no cache ainda são válidos (5 minutos)
    if (currentTime - cachedData.timestamp < 5 * 60 * 1000) {
      const response: ScrapingSuccessResponse = { status: 'sucesso', data: cachedData.data, message: 'Dados retornados do cache' };
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
      // Em desenvolvimento local: detecção automática do caminho do Chrome
      // 1. Tenta usar variável de ambiente CHROME_PATH
      // 2. Se não, tenta caminhos padrão por sistema operacional
      let executablePath = process.env.CHROME_PATH;

      if (!executablePath) {
        if (process.platform === 'win32') {
          executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        } else if (process.platform === 'linux') {
          executablePath = '/usr/bin/google-chrome';
        } else if (process.platform === 'darwin') {
           executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        } else {
          // Fallback genérico para linux
          executablePath = '/usr/bin/google-chrome-stable';
        }
      }

      console.log(`Iniciando Chrome local em: ${executablePath}`);

      browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page: Page = await browser.newPage();

    // Listener para fechar automaticamente alerts (boas práticas em scraping)
    page.on('dialog', async dialog => {
      console.log('Dialog detectado:', dialog.message());
      await dialog.dismiss();
    });

    await page.goto('https://ssw.inf.br/2/rastreamento_pf?#', {
      waitUntil: 'networkidle2', // Mais robusto que domcontentloaded
      timeout: 60000,
    });

    console.log("Aguardando o campo de CPF...");
    await page.waitForSelector('#cnpjdest', { timeout: 10000 });
    
    // Pequeno delay para garantir que scripts de input carregaram
    await new Promise(r => setTimeout(r, 500)); 
    
    await page.type('#cnpjdest', cpf);
    console.log("CPF preenchido!");

    // Forçar clique via JavaScript é frequentemente mais robusto que page.click()
    await page.evaluate(() => {
      const btn = document.getElementById('btn_rastrear');
      if (btn) btn.click();
    });
    console.log("Botão 'Rastrear' clicado via JS!");

    const tableSelector = 'table tbody';
    const errorSelector = '.erro, .msg-erro, #msgErro'; // Hipotético, para tentar capturar erros visuais

    try {
      // Espera pela tabela OU por uma mensagem de erro (race condition)
      // Como não sabemos o seletor de erro exato, focamos na tabela, mas tratamos o erro melhor
      await page.waitForSelector(tableSelector, { timeout: 20000 }); // Reduzi para 20s para falhar mais rápido se não vier
    } catch {
      console.error("Timeout aguardando tabela. Verificando se há mensagens de erro na tela...");
      
      // Captura o texto do corpo para tentar identificar o problema
      const pageText = await page.evaluate(() => document.body.innerText);
      
      await browser.close();
      
      // Se tiver texto indicando "não encontrado", retornamos 404
      if (pageText.includes('Não encontrado') || pageText.includes('Nenhuma encomenda')) {
         const response: ScrapingErrorResponse = { error: 'Nenhuma encomenda encontrada para este CPF.' };
         return new Response(JSON.stringify(response), { status: 404 });
      }

      console.error("Conteúdo da página no timeout:", pageText.substring(0, 200) + "...");
      const response: ScrapingErrorResponse = { error: 'Erro ao realizar scraping. O site demorou muito para responder ou não retornou dados.' };
      return new Response(JSON.stringify(response), { status: 504 }); // Gateway Timeout
    }

    await page.waitForFunction(
      'document.querySelector("table tbody tr") !== null',
      { timeout: 10000 }
    );

    console.log("Tabela de resultados carregada com sucesso!");

    // Realiza a extração dos dados da tabela
    const encomendas: Encomenda[] = await page.evaluate(() => {
      const encomendasList: Encomenda[] = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const encomenda: Encomenda = {
            numero: cells[0] ? cells[0].textContent?.trim() || '' : '',
            data: cells[1] ? cells[1].textContent?.trim() || '' : '',
            status: cells[2] ? cells[2].textContent?.trim() || '' : '',
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
      const response: ScrapingErrorResponse = { error: 'Nenhuma encomenda encontrada para este CPF.' };
      return new Response(JSON.stringify(response), { status: 404 });
    }

    // Retorna os dados extraídos com sucesso
    const response: ScrapingSuccessResponse = { 
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
    const response: ScrapingErrorResponse = { 
      error: 'Erro ao realizar scraping. Tente novamente mais tarde.', 
      details: errorMessage 
    };
    return new Response(JSON.stringify(response), { status: 500 });
  }
}
