import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from  pydantic import Field

load_dotenv()

class Settings(BaseSettings):

    PROJECT_NAME : str = 'DOC SHELF'


    GEMINI_API_KEY : str

    LLM_MODEL: str = Field(validation_alias='LLM_MODEL')
    LLM_MODEL_2: str = Field(validation_alias='LLM_MODEL_2')
    EMBEDDING_MODEL: str = Field(validation_alias='EMBBEDDING_MODEL')
    TEMPERATURE: float = 0.0

    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 200
    TOP_K_RETRIEVAL: int = 10
    TOP_K_RERANKED: int = 4


    UPLOAD_DIR: str = './storage/uploads'
    VECTOR_DB_DIR: str = './storage/vector_db'

    model_config = SettingsConfigDict(
        env_file = '.env',
        extra = 'ignore',
        env_prefix = ''
    )



settings = Settings()

