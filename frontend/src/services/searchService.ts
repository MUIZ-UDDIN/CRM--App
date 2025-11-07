import apiClient from './apiClient';

export interface SearchResult {
  id: string;
  type: 'deal' | 'contact' | 'activity' | 'file' | 'quote';
  title: string;
  description?: string;
  value?: string;
  link: string;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  deals: SearchResult[];
  contacts: SearchResult[];
  activities: SearchResult[];
  files: SearchResult[];
  quotes: SearchResult[];
}

export const globalSearch = async (query: string): Promise<SearchResponse> => {
  const response = await apiClient.get(`/search/?q=${encodeURIComponent(query)}`);
  return response.data;
};
