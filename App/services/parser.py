import os
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader
)

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document


def load_document(file_path: str): 

    """
        Detect file path and extract the text 
    """

    # file name and extension extracting
    file_name = str(os.path.basename(file_path))
    ext = os.path.splitext(file_path)[-1].lower()
    

    if ext == '.pdf':

        loader = PyPDFLoader(file_path)

    elif ext in ['.docx', '.doc']:
        loader = Docx2txtLoader(file_path)

    elif ext in ['.txt', '.md']:
        loader = TextLoader(file_path, encoding='utf-8', autodetect_encoding=True)

    else:
        raise ValueError(f'File format {ext} not supported')

    docs = loader.load()

    for doc in docs:
        doc.metadata['source'] = file_name

    return docs


def chunk_document(docs: list[Document], chunk_size: int = 800, chunk_overlap: int = 150):

    """
    Splits the loaded documents in smaller chunks
    """

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=['\n\n','\n'," ",""]
    )


    return splitter.split_documents(docs)


