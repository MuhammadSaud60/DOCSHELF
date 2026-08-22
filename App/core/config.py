import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from  pydantic import Field

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Settings(BaseSettings):

    PROJECT_NAME : str = 'CHAT WITH YOUR DOCUMENTS'


    GEMINI_API_KEY : str

    LLM_MODEL: str = Field(validation_alias='GEMINI_LLM_MODEL')
    EMBEDDING_MODEL: str = Field(validation_alias='EMBBEDDING_MODEL')
    TEMPERATURE: float = 0.0

    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 200
    TOP_K_RETRIEVAL: int = 10
    TOP_K_RERANKED: int = 4


    UPLOAD_DIR: str = os.path.join(BASE_DIR, "storage", "uploads")
    VECTOR_DB_DIR: str = os.path.join(BASE_DIR, "storage", "chroma_db")

    model_config = SettingsConfigDict(
        env_file = '.env',
        extra = 'ignore',
        env_prefix = ''
    )



settings = Settings()

