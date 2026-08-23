from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from App.core.config import settings

def format_docs(docs):
    if not docs:
        return "No specific document context available."
    formatted = []
    for doc in docs:
        source_name = doc.metadata.get("source", "Document")
        formatted.append(f"[File: {source_name}]\n{doc.page_content}")
    return "\n\n".join(formatted)

prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an interactive AI study tutor and document assistant.
Use the following retrieved context from uploaded documents to interact with the user.

Retrieved Document Context:
{context}

Behavioral Rules:
1. **Quiz Request**: If the user asks you to quiz them or ask a question:
   - Formulate a clear, direct question based on the document context.
   - Do NOT reveal the answer yet.

2. **Answer Assessment**: If the user is answering a question you previously asked:
   - Begin your response with a clear verdict: **Correct**, **Partially Correct**, or **Incorrect**.
   - Explain *why* in 1–2 sentences citing the context.
   - If incorrect or partial, state what was missing or what the true answer is.
   - End by asking if they want another question.

3. **Standard Q&A**: If the user asks a normal factual question, answer it directly using the context.
4. If the context does not contain enough information, state that clearly."""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}")
])

_primary_chain = None
_fallback_chain = None

def get_primary_chain():
    global _primary_chain
    if _primary_chain is None:
        primary_llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            temperature=settings.TEMPERATURE,
        )
        _primary_chain = prompt | primary_llm | StrOutputParser()
    return _primary_chain

def get_fallback_chain():
    global _fallback_chain
    if _fallback_chain is None:
        fallback_llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL_2,
            temperature=settings.TEMPERATURE,
       
        )
        _fallback_chain = prompt | fallback_llm | StrOutputParser()
    return _fallback_chain


    # retriever = vector_store.as_retriever(search_kwargs={"k" : settings.TOP_K_RETRIEVAL})



    # rag_chain = (
    #     {
    #         "context": (lambda x: x["question"]) | retriever | format_docs,
    #         "question": lambda x: x["question"],
    #         "chat_history": lambda x: x.get("chat_history", []),
    #     }
    #     | prompt
    #     | llm
    #     | StrOutputParser()
    # ) better for local

    # return _rag_chain

