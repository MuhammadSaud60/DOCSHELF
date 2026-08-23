import axios from 'axios';

let rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
rawUrl = rawUrl.replace(/[\[\]\(\)\'\"]/g, '').trim();
const API_BASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

// Persist a single session ID for the current browser session
export const getSessionId = () => {
  let sessionId = sessionStorage.getItem('docshelf_session_id');
  if (!sessionId) {
    sessionId = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('docshelf_session_id', sessionId);
  }
  return sessionId;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadDocument = async (file) => {
  const sessionId = getSessionId();
  console.log("📤 [UPLOAD] Sending file with Session ID:", sessionId);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const response = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const askQuestion = async (question, chatHistory = []) => {
  const sessionId = getSessionId();
  console.log("💬 [ASK] Querying with Session ID:", sessionId);

  const response = await apiClient.post('/ask', {
    question,
    chat_history: chatHistory,
    session_id: sessionId,
  });
  return response.data;
};

export const clearKnowledgeBase = async () => {
  const sessionId = getSessionId();
  const response = await apiClient.delete(`/clear?session_id=${sessionId}`);
  return response.data;
};

export default apiClient;