# Web Scraping de Encomendas - Desafio Técnico

## Descrição

Este projeto realiza o **web scraping** de uma página de rastreamento de encomendas e exibe os resultados em uma interface de usuário simples e funcional. A aplicação foi construída com **Next.js** no frontend e **Puppeteer** para o scraping dos dados.

O objetivo principal é buscar encomendas vinculadas a um CPF e apresentá-las ao usuário. O projeto cumpre com os requisitos do desafio, oferecendo um backend simples para scraping e um frontend intuitivo.

## Funcionalidade

- **Rastreamento de Encomendas**: O sistema permite ao usuário inserir um **CPF** e visualizar todas as encomendas vinculadas a ele.
- **Detalhamento de Encomenda**: Ao clicar em uma encomenda, o usuário pode visualizar mais detalhes sobre ela, como número, data e status.
- **Validação e Tratamento de Erros**: O sistema valida o CPF e exibe mensagens de erro detalhadas em casos de falha, como CPF inválido ou problemas com a requisição.

## Tecnologias Utilizadas

### **Frontend**
- **Next.js**: Utilizamos as API Routes do Next.js para realizar o scraping diretamente no backend da aplicação.
- **TailwindCSS**: Para estilização da interface.
- **React Hooks**: Utilizamos hooks do React (`useState`) para gerenciar os estados da aplicação, como o CPF do usuário, os dados das encomendas e os estados de carregamento e erro.

### **Backend / Web Scraping**
- **Puppeteer**: Biblioteca de scraping que utiliza o Chrome em modo headless (sem interface gráfica) para acessar e extrair informações da página de rastreamento de encomendas.
- **Next.js API Routes**: A funcionalidade de scraping é implementada dentro das **API Routes** do Next.js, o que facilita o gerenciamento da comunicação entre frontend e backend.

## Como Rodar Localmente

### Pré-requisitos
1. **Node.js**: Versão 14 ou superior instalada.
2. **Git**: Para clonar o repositório.

### Passos para rodar o projeto

1. Clone o repositório:
   ```bash
   git clone https://github.com/castro-ed/web-scraping-encomendas.git
   cd web-scraping-encomendas

2. Instale as dependências:
   ```bash
   npm install

3. Para rodar o servidor de desenvolvimento localmente, use o comando:
   ```bash
   npm run dev

## Como Funciona

### Fluxo da Aplicação:

1. **Input de CPF**: O usuário insere um CPF no campo de input.
2. **Requisição ao Backend**: Ao clicar em "Rastrear", a aplicação envia o CPF para o backend (usando uma API Route do Next.js) que executa o scraping.
3. **Scraping com Puppeteer**: O Puppeteer acessa a página de rastreamento e extrai as encomendas associadas ao CPF informado.
4. **Exibição no Frontend**: As encomendas são exibidas em uma tabela. O usuário pode ver os detalhes de cada encomenda, como número, data e status.

### Arquitetura do Projeto

#### **Frontend**:
- O frontend foi construído com **Next.js** utilizando **React** e **TailwindCSS**. O código foi organizado de maneira simples e funcional.
- Utilizamos o estado do React para gerenciar a entrada do CPF, o estado de carregamento, os erros e os dados das encomendas.

#### **Backend (Web Scraping)**:
- Utilizamos **Puppeteer** para fazer o scraping da página de rastreamento de encomendas.
- O backend é implementado dentro das **API Routes** do Next.js.
- O scraping é feito de maneira assíncrona, e a resposta é enviada ao frontend com os dados extraídos.

## Cache de Resultados (Otimização)

Para otimizar o desempenho e evitar a repetição de requisições ao scraping para o mesmo CPF, implementamos um **cache simples** no backend. Os resultados das requisições são armazenados na memória do servidor por 5 minutos. Caso o mesmo CPF seja consultado dentro desse intervalo, o sistema retorna os dados do cache, evitando uma nova execução do scraping.

## Tratamento de Erros

- **Erro no CPF**: Se o CPF não for válido (não tiver 11 dígitos), a aplicação retorna uma mensagem de erro.
- **Erro no scraping**: Caso o scraping falhe (exemplo: página fora do ar ou estrutura alterada), o sistema exibe uma mensagem de erro explicativa.
- **Erros do servidor**: Caso algo inesperado aconteça no backend, o sistema também retorna uma mensagem de erro amigável para o usuário.