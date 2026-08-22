from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from ..core.config import settings


def format_docs(docs):

    """
    Helper function to join the chunks into one text block
    """

    formatted = []

    for doc in docs:
        source_name = doc.metadata.get("source", 'Document')
        formatted.append(f"[File: {source_name}]\n{doc.page_content}")

    return '\n\n'.join(formatted)


def get_rag_chain(vector_store):

    """
    complete rag chain 
    """

    llm = ChatGoogleGenerativeAI(
        model=settings.LLM_MODEL,
        temperature= settings.TEMPERATURE
    )


    retriever = vector_store.as_retriever(search_kwargs={"k" : settings.TOP_K_RETRIEVAL})


    prompt = ChatPromptTemplate.from_template(
        """You are a professional and helpful AI Document Assistant.

        Context from uploaded documents:
        {context}

        User Question: {question}

        Instructions:
        1. GREETINGS: If the user says "hi", "hello", or similar pleasantries, greet them back warmly and let them know you're ready to answer questions about their uploaded files.
        2. SUMMARIES & GENERAL OVERVIEWS: If the user asks "what is this document about?", "tell me about uploaded documents", or asks for a summary, provide a clear overview synthesized from the context.
        3. FACTUAL ACCURACY: For specific technical, professional, or biographical questions, answer strictly using the facts in the context. Never invent details.
        4. MISSING INFO: If the information is completely missing from the context, state: "I could not find that information in the uploaded documents."

        Answer:"""
            )


    rag_chain = (
        {'context': retriever | format_docs, "question" : RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )


    return rag_chain

