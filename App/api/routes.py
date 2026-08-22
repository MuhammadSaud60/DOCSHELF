import os
import shutil
import traceback
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from App.services.parser import load_document, chunk_document
from App.services.vector_store import create_or_update_vector_store, load_vector_store, clear_vector_store, is_vector_store_empty
from App.services.rag_chain import format_docs, get_rag_chain

from ..core.config import settings


router = APIRouter(prefix='/api/v1', tags=['RAG'])


os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


class QueryRequest(BaseModel):

    question : str

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

@router.post('/upload')
async def upload_file(file: UploadFile = File(...)):

    
    """
    Upload documents & Index into vector store
    """

    if not file.filename:
        raise HTTPException(status_code=400, detail='filename missing')


    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)

    with open(file_path, 'wb') as buffer:

        shutil.copyfileobj(file.file, buffer)


    try:
        raw_docs = load_document(file_path)
        chunks = chunk_document(raw_docs)
        create_or_update_vector_store(chunks)


        return {
            "message" : f"{file.filename} processed successfully",
            "total_chunks_created" : len(chunks)
        }


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


    finally:
        if os.path.exists(file_path):
            os.remove(file_path)



@router.post("/ask")
async def ask_question(request: QueryRequest):
    try:
        vector_store = load_vector_store()
        chain = get_rag_chain(vector_store)
        result = chain.invoke(request.question)

        
        if hasattr(result, "content"):
            answer_text = result.content
        elif isinstance(result, dict):
            answer_text = result.get("answer") or result.get("result") or str(result)
        else:
            answer_text = str(result)

        return {"question": request.question, "answer": answer_text}
    except Exception as e:
        print("Ask Route Error Traceback:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))