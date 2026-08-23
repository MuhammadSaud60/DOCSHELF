import os
import chromadb
import re
# from langchain_huggingface import HuggingFaceEmbeddings FOR LOCAL BEST
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings # FOR DEPLOYMENT BECAUSE OF SIZE 
from langchain_chroma import Chroma
from langchain_core.documents import Document
from ..core.config import settings


COLLECTION_NAME = 'rag_documents'

_embedding_model = None
_chroma_client = None

def get_embedding_model():
#     return HuggingFaceEmbeddings(
#         model_name=settings.EMBEDDING_MODEL
#     ) FOR LOCAL

     global _embedding_model

     if _embedding_model is None:
        print("Initializing FastEmbed model into RAM...")
        _embedding_model = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
     return _embedding_model # FOR DEPLOYMENT


def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=settings.VECTOR_DB_DIR)
    return _chroma_client

def get_clean_collection_name(session_id: str) -> str:
    
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', session_id)
    return f"sess_{safe_id}"[:63]


def get_vector_store():
    embeddings = get_embedding_model()
    return Chroma(
        persist_directory=settings.VECTOR_DB_DIR,
        embedding_function=embeddings,
        collection_name=COLLECTION_NAME
    )
def clear_vector_store():
    """Wipes the collection directly from ChromaDB SQLite storage."""
    client = chromadb.PersistentClient(path=settings.VECTOR_DB_DIR)
    try:
        client.delete_collection(name=COLLECTION_NAME)
        print(f"ChromaDB collection '{COLLECTION_NAME}' wiped successfully!")
    except Exception as e:
        print(f"ℹClear collection note: {e}")

def is_vector_store_empty() -> bool:
    """Checks if the Chroma collection exists and contains any chunks."""
    try:
        vs = get_vector_store()
        count = vs._collection.count()
        return count == 0
    except Exception:
        return True


def create_or_update_vector_store(chunks: list[Document], session_id: str):
    embeddings = get_embedding_model()
    client = get_chroma_client()
    collection_name = get_clean_collection_name(session_id)

    try:
        client.delete_collection(name=collection_name)
    except Exception:
        pass

    return Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        client=client,
        collection_name=collection_name
    )


def load_vector_store(session_id: str):
    embeddings = get_embedding_model()
    client = get_chroma_client()
    collection_name = get_clean_collection_name(session_id)

    return Chroma(
        client=client,
        collection_name=collection_name,
        embedding_function=embeddings
    )
