import os
import shutil
import traceback
from fastapi import APIRouter, UploadFile, File, HTTPException
from langchain_core.messages import HumanMessage, AIMessage
from pydantic import BaseModel
from App.services.parser import load_document, chunk_document
from App.services.vector_store import create_or_update_vector_store, load_vector_store, clear_vector_store, is_vector_store_empty
from App.services.rag_chain import format_docs, get_rag_chain

from ..core.config import settings


router = APIRouter(prefix='/api/v1', tags=['RAG'])


os.makedirs(settings.UPLOAD_DIR, exist_ok=True)



class ChatMessage(BaseModel):
    role: str
    text: str

class QueryRequest(BaseModel):
    question : str
    chat_history: list[ChatMessage] = []




@router.delete("/clear")
async def clear_database():
    """Wipes all indexed data from ChromaDB."""
    try:
        clear_vector_store()
        print("[BACKEND] Database cleared successfully via API call <<<")
        return {"status": "success", "message": "Knowledge base cleared."}
    except Exception as e:
        print(f"[BACKEND ERROR] Failed to clear: {e} <<<")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        raw_docs = load_document(file_path)
        if not raw_docs:
            raise ValueError("No text could be extracted from this document.")

        chunks = chunk_document(raw_docs)
        print(f"Extracted {len(chunks)} chunks from {file.filename}")

        create_or_update_vector_store(chunks)
        print("Document successfully indexed in ChromaDB")

        return {
            "message": f"'{file.filename}' processed successfully!",
            "total_chunks_created": len(chunks)
        }
    except Exception as e:
        print("Upload Error Traceback:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)



@router.post("/ask")
async def ask_question(request: QueryRequest):
    try:
        vector_store = load_vector_store()
       
        formatted_history = []
        for msg in request.chat_history:
            if msg.role == "user":
                formatted_history.append(HumanMessage(content=msg.text))
            elif msg.role == "assistant":
                formatted_history.append(AIMessage(content=msg.text))

        chain = get_rag_chain(vector_store)
        answer = chain.invoke({
            "question": request.question,
            "chat_history": formatted_history,
        })

        return {"question": request.question, "answer": answer}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))