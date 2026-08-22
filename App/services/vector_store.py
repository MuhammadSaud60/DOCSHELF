import os
import chromadb
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


def create_or_update_vector_store(chunks: list[Document]):
    embeddings = get_embedding_model()
    client = chromadb.PersistentClient(path=settings.VECTOR_DB_DIR)
    return Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        client=client,
        collection_name=COLLECTION_NAME
    )



def load_vector_store():
    embeddings = get_embedding_model()
    client = chromadb.PersistentClient(path=settings.VECTOR_DB_DIR)
    return Chroma(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings
    )


