from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from ..core.config import settings


def format_docs(docs):

    """
    Helper function to join the chunks into one text block
    """

    if not docs:
        return "No specific document context available."

    formatted = []

    for doc in docs:
        source_name = doc.metadata.get("source", 'Document')
        formatted.append(f"[File: {source_name}]\n{doc.page_content}")

    return '\n\n'.join(formatted)


def get_rag_chain(vector_store):

    """
    complete rag chain  with history
    """

    llm = ChatGoogleGenerativeAI(
        model=settings.LLM_MODEL,
        temperature= settings.TEMPERATURE
    )


    retriever = vector_store.as_retriever(search_kwargs={"k" : settings.TOP_K_RETRIEVAL})


    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an interactive AI study tutor and document assistant.
        Use the following retrieved context from the uploaded documents to interact with the user.

        Retrieved Document Context:
        {context}

        Behavioral Rules:
        1. **Quiz Request**: If the user asks you to quiz them or ask a question (e.g., "ask me a question", "test me"):
        - Formulate a clear, direct question based on the document context.
        - Do NOT reveal the answer yet.

        2. **Answer Assessment (CRITICAL)**: If the user is answering a question you previously asked:
        - Begin your response with a clear verdict: **Correct**, **Partially Correct**, or **Incorrect**.
        - Explain *why* in 1–2 sentences citing the document facts.
        - If incorrect or partial, state what was missing or what the true answer is.
        - End by asking if they want another question or proceed to ask the next question.

        3. **Standard Q&A**: If the user is asking a normal factual question about the document, answer it directly using the context.
        4. If the context does not contain enough information, state that clearly."""),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{question}")
            ])

    rag_chain = (
        {
            "context": (lambda x: x["question"]) | retriever | format_docs,
            "question": lambda x: x["question"],
            "chat_history": lambda x: x.get("chat_history", []),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain
