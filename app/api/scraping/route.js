import puppeteer from 'puppeteer-core'; // Usando Puppeteer core para ambientes serverless (como o Vercel)

const cache = new Map(); // Cache simples na memória (armazenando os resultados por 5 minutos)

export async function GET(req) {
  const { searchParams } = new URL(req.url); // Obtém os parâmetros de consulta da URL
  const cpf = searchParams.get('cpf'); // Recupera o CPF do parâmetro da URL

  // Validação do CPF: Verifica se foi passado na requisição
  if (!cpf) {
    return new Response(
      JSON.stringify({ error: 'CPF é necessário' }),
      { status: 400 }
    );
  }

  // Validação adicional para garantir que o CPF tenha 11 dígitos
  if (!/^\d{11}$/.test(cpf)) {
    return new Response(
      JSON.stringify({ error: 'CPF inválido. Deve conter 11 dígitos.' }),
      { status: 400 }
    );
  }

  // Verifica se o CPF já está armazenado no cache e se os dados são válidos
  if (cache.has(cpf)) {
    const cachedData = cache.get(cpf);
    const currentTime = Date.now();

    // Verifica se os dados no cache ainda são válidos (5 minutos)
    if (currentTime - cachedData.timestamp < 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ status: 'sucesso', data: cachedData.data }),
        { status: 200 }
      );
    }
  }

  try {
    console.log("Acessando a página de rastreamento...");

    // Lançando o Puppeteer com as configurações apropriadas para Vercel e ambientes serverless
    const browser = await puppeteer.launch({
      headless: true, // Roda o navegador em modo headless (sem interface gráfica)
      args: [
        '--no-sandbox', // Necessário para evitar problemas de sandbox em ambientes serverless
        '--disable-setuid-sandbox', // Outro parâmetro para garantir segurança e compatibilidade
      ],
      executablePath: process.env.VERCEL
        ? '/opt/bin/chromium'  // Se estiver no Vercel, usa o caminho correto para o Chromium
        : puppeteer.executablePath(),  // Se localmente, utiliza o caminho do Puppeteer instalado
      defaultViewport: null, // Usa o tamanho padrão de viewport do Puppeteer
      userDataDir: '/tmp/puppeteer_data',  // Diretório temporário no Vercel para armazenar dados do navegador
    });

    const page = await browser.newPage(); // Cria uma nova aba no navegador

    // Acessa a página de rastreamento
    await page.goto('https://ssw.inf.br/2/rastreamento_pf?#', {
      waitUntil: 'domcontentloaded', // Espera até o DOM ser completamente carregado
      timeout: 60000, // Timeout de 60 segundos
    });

    console.log("Aguardando o campo de CPF...");
    await page.waitForSelector('#cnpjdest', { timeout: 10000 }); // Espera até o campo do CPF aparecer
    console.log("Campo de CPF encontrado!");

    await page.type('#cnpjdest', cpf); // Preenche o campo de CPF com o valor fornecido
    console.log("CPF preenchido!");

    await page.click('#btn_rastrear'); // Clica no botão de "Rastrear"
    console.log("Botão 'Rastrear' clicado!");

    const tableSelector = 'table tbody'; // Seletor da tabela onde os dados estão

    try {
      await page.waitForSelector(tableSelector, { timeout: 30000 }); // Espera a tabela de resultados ser carregada
    } catch (error) {
      console.error("Erro ao realizar scraping: Timeout ou falha ao encontrar a tabela.");
      await browser.close(); // Fecha o navegador se ocorrer erro
      return new Response(
        JSON.stringify({ error: 'Erro ao realizar scraping. Tabela não encontrada.' }),
        { status: 500 }
      );
    }

    await page.waitForFunction(
      'document.querySelector("table tbody tr") !== null', // Verifica se a tabela tem conteúdo
      { timeout: 30000 }
    );

    console.log("Tabela de resultados carregada com sucesso!");

    // Realiza a extração dos dados da tabela
    const encomendas = await page.evaluate(() => {
      const encomendasList = []; // Lista para armazenar os dados extraídos
      const rows = document.querySelectorAll('table tbody tr'); // Seleciona todas as linhas da tabela

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td'); // Seleciona todas as células de cada linha
        if (cells.length >= 3) { // Se houver pelo menos 3 células, extrai os dados
          const encomenda = {
            numero: cells[0] ? cells[0].textContent.trim() : 'Não disponível',
            data: cells[1] ? cells[1].textContent.trim() : 'Não disponível',
            status: cells[2] ? cells[2].textContent.trim() : 'Não disponível',
          };
          encomendasList.push(encomenda); // Adiciona os dados à lista
        }
      });

      return encomendasList; // Retorna a lista de encomendas
    });

    await browser.close(); // Fecha o navegador

    // Armazenando os resultados no cache com o timestamp
    cache.set(cpf, { data: encomendas, timestamp: Date.now() });

    // Caso não haja encomendas, retorna erro 404
    if (encomendas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma encomenda encontrada para este CPF.' }),
        { status: 404 }
      );
    }

    // Retorna os dados extraídos com sucesso
    return new Response(
      JSON.stringify({ status: 'sucesso', data: encomendas, message: 'Encomendas extraídas com sucesso!' }),
      { status: 200 }
    );
  } catch (error) {
    // Captura e loga qualquer erro ocorrido durante o processo
    console.error('Erro ao realizar scraping:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao realizar scraping. Tente novamente mais tarde.', details: error.message }),
      { status: 500 }
    );
  }
}
