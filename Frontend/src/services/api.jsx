import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const askQuestion = async (question, chatHistory = []) => {
  const response = await apiClient.post('/ask', {
    question,
    chat_history: chatHistory,
  });
  return response.data;
};

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const clearKnowledgeBase = async () => {
  const response = await apiClient.delete('/clear');
  return response.data;
};