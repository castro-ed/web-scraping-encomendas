import puppeteer from 'puppeteer'; // Usando Puppeteer completo

// Cache simples na memória (armazenando os resultados dos CPFs por 5 minutos)
const cache = new Map();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get('cpf');

  // Validação: Verifica se o CPF foi fornecido na requisição
  if (!cpf) {
    return new Response(
      JSON.stringify({ error: 'CPF é necessário' }),
      { status: 400 }
    );
  }

  // Validação adicional do CPF
  if (!/^\d{11}$/.test(cpf)) {
    return new Response(
      JSON.stringify({ error: 'CPF inválido. Deve conter 11 dígitos.' }),
      { status: 400 }
    );
  }

  // Verificar se o CPF está no cache e se a resposta ainda é válida
  if (cache.has(cpf)) {
    const cachedData = cache.get(cpf);
    const currentTime = Date.now();

    // Verifica se o cache expirou (5 minutos)
    if (currentTime - cachedData.timestamp < 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ status: 'sucesso', data: cachedData.data }),
        { status: 200 }
      );
    }
  }

  try {
    console.log("Acessando a página de rastreamento...");

    // Configuramos o Puppeteer para usar o Chrome adequado no Vercel ou localmente
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        ...(process.env.VERCEL ? [] : []) // Se estiver no Vercel, usa o Chrome otimizado para AWS Lambda
      ],
      executablePath: puppeteer.executablePath(),  // Caminho do Puppeteer localmente
      defaultViewport: null, // Usando o padrão de viewport do Puppeteer
      userDataDir: '/tmp/puppeteer_data',  // Diretório temporário para dados no Vercel
    });

    const page = await browser.newPage();

    // Acessa a página de rastreamento
    await page.goto('https://ssw.inf.br/2/rastreamento_pf?#', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    console.log("Aguardando o campo de CPF...");
    await page.waitForSelector('#cnpjdest', { timeout: 10000 });
    console.log("Campo de CPF encontrado!");

    // Preenche o campo de CPF com o valor fornecido
    await page.type('#cnpjdest', cpf);
    console.log("CPF preenchido!");

    // Clica no botão de "RASTREAR"
    await page.click('#btn_rastrear');
    console.log("Botão 'Rastrear' clicado!");

    // Espera que o conteúdo da tabela seja carregado completamente
    console.log("Aguardando a tabela de resultados...");
    const tableSelector = 'table tbody';

    try {
      await page.waitForSelector(tableSelector, { timeout: 30000 });
    } catch (error) {
      console.error("Erro ao realizar scraping: Timeout ou falha ao encontrar a tabela.");
      await browser.close();
      return new Response(
        JSON.stringify({ error: 'Erro ao realizar scraping. Tabela não encontrada.' }),
        { status: 500 }
      );
    }

    await page.waitForFunction(
      'document.querySelector("table tbody tr") !== null',
      { timeout: 30000 }
    );

    console.log("Tabela de resultados carregada com sucesso!");

    // Realiza a extração dos dados da página
    const encomendas = await page.evaluate(() => {
      const encomendasList = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const encomenda = {
            numero: cells[0] ? cells[0].textContent.trim() : 'Não disponível',
            data: cells[1] ? cells[1].textContent.trim() : 'Não disponível',
            status: cells[2] ? cells[2].textContent.trim() : 'Não disponível',
          };
          encomendasList.push(encomenda);
        }
      });

      return encomendasList;
    });

    await browser.close();

    // Armazenando no cache com timestamp
    cache.set(cpf, { data: encomendas, timestamp: Date.now() });

    if (encomendas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma encomenda encontrada para este CPF.' }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ status: 'sucesso', data: encomendas, message: 'Encomendas extraídas com sucesso!' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao realizar scraping:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao realizar scraping', details: error.message }),
      { status: 500 }
    );
  }
}
