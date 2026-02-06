// Tipagem para uma encomenda
export interface Encomenda {
  numero: string;
  data: string;
  status: string;
  comentarios?: string;
}

// Resposta de sucesso da API
export interface ScrapingSuccessResponse {
  status: 'sucesso';
  data: Encomenda[];
  message: string;
}

// Resposta de erro da API
export interface ScrapingErrorResponse {
  error: string;
  details?: string;
}

// Union type para a resposta da API (pode ser sucesso ou erro)
export type ScrapingResponse = ScrapingSuccessResponse | ScrapingErrorResponse;
