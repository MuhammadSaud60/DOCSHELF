import axios from 'axios';

// 1. Sanitize Backend URL
let rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
rawUrl = rawUrl.replace(/[\[\]\(\)\'\"]/g, '').trim();
const API_BASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

// 2. Tab-isolated session ID
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

// 3. Universal Query Function (Handles Streaming SSE + Standard JSON)
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
    throw new Error(`Server returned status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';

  // Case A: Backend returned Standard JSON
  if (contentType.includes('application/json')) {
    const data = await response.json();
    const finalAnswer = data.answer || data.text || JSON.stringify(data);
    onChunk(finalAnswer);
    return finalAnswer;
  }

  // Case B: Backend returned Event Stream (SSE)
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
      if (!trimmed) continue;

      if (trimmed.startsWith('data: ')) {
        const payload = trimmed.replace('data: ', '').trim();
        if (payload === '[DONE]') break;

        try {
          const parsed = JSON.parse(payload);
          if (parsed.text) {
            accumulatedText += parsed.text;
            onChunk(accumulatedText);
          } else if (parsed.answer) {
            accumulatedText += parsed.answer;
            onChunk(accumulatedText);
          }
        } catch {
          // If raw text chunk without JSON wrapping
          accumulatedText += payload;
          onChunk(accumulatedText);
        }
      }
    }
  }

  // Fallback if buffer still holds unparsed text
  if (!accumulatedText && buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer.trim());
      accumulatedText = parsed.answer || parsed.text || buffer.trim();
      onChunk(accumulatedText);
    } catch {
      accumulatedText = buffer.trim();
      onChunk(accumulatedText);
    }
  }

  return accumulatedText;
};

// 4. File Upload
export const uploadDocument = async (file) => {
  const sessionId = getSessionId();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
  return response.data;
};

// 5. Clear Workspace
export const clearKnowledgeBase = async () => {
  const sessionId = getSessionId();
  const response = await axios.delete(`${API_BASE_URL}/clear?session_id=${sessionId}`);
  return response.data;
};