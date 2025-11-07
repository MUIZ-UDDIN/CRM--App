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

export const navigationSearch = async (query: string): Promise<NavigationSearchResponse> => {
  const response = await apiClient.get(`/search/?q=${encodeURIComponent(query)}`);
  return response.data;
};
