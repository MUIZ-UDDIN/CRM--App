import apiClient from './apiClient';

export interface NavigationResult {
  name: string;
  description: string;
  path: string;
  icon: string;
  category: string;
}

export interface NavigationSearchResponse {
  query: string;
  results: NavigationResult[];
}

export interface GlobalSearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  description?: string;
  path: string;
  icon: string;
}

export interface GlobalSearchResponse {
  query: string;
  total_count: number;
  contacts: GlobalSearchResult[];
  deals: GlobalSearchResult[];
  quotes: GlobalSearchResult[];
  files: GlobalSearchResult[];
  activities: GlobalSearchResult[];
  pipelines: GlobalSearchResult[];
  workflows: GlobalSearchResult[];
  emails: GlobalSearchResult[];
  sms: GlobalSearchResult[];
  calls: GlobalSearchResult[];
  pages: NavigationResult[];
}

export const navigationSearch = async (query: string): Promise<NavigationSearchResponse> => {
  const response = await apiClient.get(`/search/?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const globalSearch = async (query: string): Promise<GlobalSearchResponse> => {
  const response = await apiClient.get(`/search/global?q=${encodeURIComponent(query)}`);
  return response.data;
};
