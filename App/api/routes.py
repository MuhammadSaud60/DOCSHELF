import os
import shutil
import traceback
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

from App.core.config import settings
from App.services.parser import load_document, chunk_document
from App.services.vector_store import (
    create_or_update_vector_store,
    load_vector_store,
    clear_vector_store
)
from App.services.rag_chain import get_rag_chain, format_docs

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
        return {"status": "success", "message": f"Knowledge base for session '{session_id}' cleared."}
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
            raise ValueError("No text could be extracted from this document.")

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
def ask_question(request: QueryRequest):
    query_text = request.question.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        # Load user/tab-isolated vector store
        vector_store = load_vector_store(session_id=request.session_id)
        docs = vector_store.similarity_search(query_text, k=4)
        context_str = format_docs(docs)

        formatted_history = []
        for msg in request.chat_history:
            if msg.role == "user":
                formatted_history.append(HumanMessage(content=str(msg.text)))
            elif msg.role == "assistant":
                formatted_history.append(AIMessage(content=str(msg.text)))

        chain = get_rag_chain(vector_store)
        result = chain.invoke({
            "context": context_str,
            "chat_history": formatted_history,
            "question": query_text
        })

        answer_text = str(result).strip() if result else "No answer could be generated."

        return JSONResponse(
            status_code=200,
            content={"question": query_text, "answer": answer_text}
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))