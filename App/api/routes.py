import os
import shutil
import json
import traceback
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

from App.core.config import settings
from App.services.parser import load_document, chunk_document
from App.services.vector_store import (
    create_or_update_vector_store,
    load_vector_store,
    clear_vector_store
)
from App.services.rag_chain import (
    get_primary_chain,
    get_fallback_chain,
    format_docs
)

router = APIRouter(prefix="/api/v1", tags=["RAG"])

class ChatMessage(BaseModel):
    role: str
    text: str

class QueryRequest(BaseModel):
    question: str
    session_id: str = "default_session"
    chat_history: List[ChatMessage] = []

@router.delete("/clear")
def clear_database(session_id: str = Query("default_session")):
    try:
        clear_vector_store(session_id)
        return {"status": "success", "message": f"Cleared session {session_id}"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form("default_session")
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, f"{session_id}_{file.filename}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        raw_docs = load_document(file_path)
        if not raw_docs:
            raise ValueError("No text extracted from document.")

        chunks = chunk_document(raw_docs)
        create_or_update_vector_store(chunks, session_id=session_id)

        return {
            "message": f"'{file.filename}' processed successfully!",
            "total_chunks_created": len(chunks),
            "session_id": session_id
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/ask")
async def ask_question_stream(request: QueryRequest):
    query_text = request.question.strip()
    session_id = request.session_id

    if not query_text:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        vector_store = load_vector_store(session_id=session_id)
        docs = vector_store.similarity_search(query_text, k=3)
        context_str = format_docs(docs)

        formatted_history = []
        for msg in request.chat_history:
            if msg.text.strip():
                if msg.role == "user":
                    formatted_history.append(HumanMessage(content=str(msg.text)))
                elif msg.role == "assistant":
                    formatted_history.append(AIMessage(content=str(msg.text)))

        payload = {
            "context": context_str,
            "chat_history": formatted_history,
            "question": query_text
        }

        async def token_generator():
            primary_chain = get_primary_chain()
            fallback_chain = get_fallback_chain()
            stream_started = False

            try:
              
                async for chunk in primary_chain.astream(payload):
                    if chunk:
                        stream_started = True
                        yield f"data: {json.dumps({'text': str(chunk)})}\n\n"
                yield "data: [DONE]\n\n"

            except Exception as primary_error:
                print(f"Primary model failed ({primary_error}). Activating fallback model...")
              
                try:
                    async for chunk in fallback_chain.astream(payload):
                        if chunk:
                            yield f"data: {json.dumps({'text': str(chunk)})}\n\n"
                    yield "data: [DONE]\n\n"
                except Exception as fallback_error:
                    print(f"Both primary and fallback models failed: {fallback_error}")
                    yield f"data: {json.dumps({'error': 'All model providers are currently rate-limited. Please retry in a moment.'})}\n\n"

        return StreamingResponse(
            token_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))