import axios from 'axios';

let rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
rawUrl = rawUrl.replace(/[\[\]\(\)\'\"]/g, '').trim();
const API_BASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

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

export const streamQuestion = async (question, chatHistory, onChunk) => {
  const sessionId = getSessionId();

  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      chat_history: chatHistory,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const payload = trimmed.replace('data: ', '').trim();
      if (payload === '[DONE]') break;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (typeof parsed.text === 'string') {
          accumulatedText += parsed.text;
          onChunk(accumulatedText);
        }
      } catch (err) {
        if (err.message && !err.message.includes('JSON')) {
          throw err;
        }
      }
    }
  }

  return accumulatedText;
};

export const uploadDocument = async (file) => {
  const sessionId = getSessionId();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const response = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const clearKnowledgeBase = async () => {
  const sessionId = getSessionId();
  const response = await apiClient.delete(`/clear?session_id=${sessionId}`);
  return response.data;
};

export default apiClient;