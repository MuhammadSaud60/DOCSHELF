import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL | 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadDocument = async (file, config = {}) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/upload', formData, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...config.headers,
    },
  });
  return response.data;
};

export const askQuestion = async (question, config = {}) => {
  const response = await apiClient.post('/ask', { question }, config);
  return response.data;
};

export const clearKnowledgeBase = async (config = {}) => {
  const response = await apiClient.delete('/clear', config);
  return response.data;
};
