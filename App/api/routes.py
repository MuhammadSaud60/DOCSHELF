import os
import shutil
import json
import traceback
import uuid
import gc
from typing import List, Dict
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

from App.core.config import settings
from App.services.parser import load_document, load_document_lazy, chunk_document
from App.services.vector_store import (
    create_or_update_vector_store,
    load_vector_store,
    clear_vector_store,
    get_embedding_model,
    get_chroma_client,
    get_clean_collection_name,
)
from App.services.rag_chain import (
    get_primary_chain,
    get_fallback_chain,
    format_docs
)

router = APIRouter(prefix="/api/v1", tags=["RAG"])

# In-memory job status tracker for background upload processing
_upload_jobs: Dict[str, dict] = {}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

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

def _process_upload_job(job_id: str, file_path: str, filename: str, session_id: str):
    """Background worker: parse, chunk, and index the document.

    Streams the document page-by-page (lazy load) so large files never
    sit fully in RAM, and indexes in small batches.
    """
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    _upload_jobs[job_id] = {"status": "processing", "filename": filename}
    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=['\n\n', '\n', " ", ""],
        )

        embeddings = get_embedding_model()
        client = get_chroma_client()
        collection_name = get_clean_collection_name(session_id)

        # Wipe prior session data before indexing the new document
        clear_vector_store(session_id)

        from langchain_chroma import Chroma
        vector_store = Chroma(
            client=client,
            collection_name=collection_name,
            embedding_function=embeddings,
        )

        total_chunks = 0
        batch = []
        BATCH_DOCS = 10  # pages per batch before chunk+embed+write

        def _flush():
            nonlocal total_chunks, batch
            if not batch:
                return
            chunks = splitter.split_documents(batch)
            for i in range(0, len(chunks), 32):
                vector_store.add_documents(chunks[i:i + 32])
            total_chunks += len(chunks)
            batch = []
            gc.collect()

        for doc in load_document_lazy(file_path):
            batch.append(doc)
            if len(batch) >= BATCH_DOCS:
                _flush()
        _flush()  # remainder

        if total_chunks == 0:
            raise ValueError("No text extracted from document.")

        _upload_jobs[job_id] = {
            "status": "done",
            "filename": filename,
            "total_chunks_created": total_chunks,
            "session_id": session_id,
        }
    except Exception as e:
        traceback.print_exc()
        _upload_jobs[job_id] = {"status": "failed", "filename": filename, "error": str(e)}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@router.post("/upload")
def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: str = Form("default_session")
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Reject oversized files early with a clear message
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({file_size // (1024*1024)}MB). Max allowed is {MAX_FILE_SIZE // (1024*1024)}MB.",
        )

    job_id = str(uuid.uuid4())
    file_path = os.path.join(settings.UPLOAD_DIR, f"{session_id}_{job_id}_{file.filename}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    _upload_jobs[job_id] = {"status": "queued", "filename": file.filename}
    background_tasks.add_task(_process_upload_job, job_id, file_path, file.filename, session_id)

    # Return immediately so large documents don't time out the HTTP request
    return {
        "message": f"'{file.filename}' upload received, processing in background.",
        "job_id": job_id,
        "session_id": session_id,
        "status_url": f"/api/v1/upload/status/{job_id}",
    }


@router.get("/upload/status/{job_id}")
def upload_status(job_id: str):
    job = _upload_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"job_id": job_id, **job}

@router.post("/ask")
async def ask_question_stream(request: QueryRequest):
    query_text = request.question.strip()
    session_id = request.session_id

    if not query_text:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        vector_store = load_vector_store(session_id=session_id)
        docs = vector_store.similarity_search(query_text, k=settings.TOP_K_RETRIEVAL)
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