import os
import re
import chromadb
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from App.core.config import settings

COLLECTION_NAME_PREFIX = "sess"

# Global singletons cached in RAM
_embedding_model = None
_chroma_client = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    return _embedding_model

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        os.makedirs(settings.VECTOR_DB_DIR, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=settings.VECTOR_DB_DIR)
    return _chroma_client

def get_clean_collection_name(session_id: str) -> str:
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', session_id)
    name = f"{COLLECTION_NAME_PREFIX}_{safe_id}"
    return name[:63]

def clear_vector_store(session_id: str):
    try:
        client = get_chroma_client()
        collection_name = get_clean_collection_name(session_id)
        
       
        collections = [c.name for c in client.list_collections()]
        if collection_name in collections:
            client.delete_collection(name=collection_name)
            print(f"Cleared collection: {collection_name}")
    except Exception as e:
        print(f"Clear collection notice: {e}")

def create_or_update_vector_store(chunks: list[Document], session_id: str):
    embeddings = get_embedding_model()
    client = get_chroma_client()
    collection_name = get_clean_collection_name(session_id)

    
    try:
        collections = [c.name for c in client.list_collections()]
        if collection_name in collections:
            client.delete_collection(name=collection_name)
    except Exception as e:
        print(f"Recreation notice: {e}")

   
    vector_store = Chroma(
        client=client,
        collection_name=collection_name,
        embedding_function=embeddings,
    )

    if chunks:
        vector_store.add_documents(chunks)

    return vector_store

def load_vector_store(session_id: str):
    embeddings = get_embedding_model()
    client = get_chroma_client()
    collection_name = get_clean_collection_name(session_id)

    return Chroma(
        client=client,
        collection_name=collection_name,
        embedding_function=embeddings,
    )