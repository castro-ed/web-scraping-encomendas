// Tipagem para uma encomenda
export interface Encomenda {
  numero: string;
  data: string;
  status: string;
  comentarios?: string;
}

// Tipagem para a resposta da API de scraping
export interface ScrapingResponse {
  status?: string;
  data?: Encomenda[];
  message?: string;
  error?: string;
  details?: string;
}
