from fastapi import FastAPI
from App.api.routes import router as rag_router
from fastapi.middleware.cors import CORSMiddleware



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


@app.get('/health')
def health_check():
    return {'status': 'healthy'}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)