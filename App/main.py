from fastapi import FastAPI
from App.api.routes import router as rag_router
from App.services.vector_store import get_embedding_model
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager



app = FastAPI(
    title='CHAT WITH YOUR DOCUMENTS',
    description='Universal document Q&A API built with LangChain',
    version='1.0.0'
)


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)



app.include_router(rag_router)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-download and cache model into RAM at startup
    print("Warming up FastEmbed embedding model...")
    try:
        model = get_embedding_model()
        model.embed_documents(["warmup text"])
        print("✅ FastEmbed model loaded successfully.")
    except Exception as e:
        print(f"⚠️ Model warmup warning: {e}")
    yield

@app.get("/")
def health_check():
    return {"status": "online", "message": "DOCSHELF Backend is running"}

@app.get('/health')
def health_check():
    return {'status': 'healthy'}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)