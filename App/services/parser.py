import os
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader
)

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document


def _get_loader(file_path: str):
    """Return the right LangChain loader for the file extension."""
    ext = os.path.splitext(file_path)[-1].lower()

    if ext == '.pdf':
        return PyPDFLoader(file_path)
    elif ext in ['.docx', '.doc']:
        return Docx2txtLoader(file_path)
    elif ext in ['.txt', '.md']:
        return TextLoader(file_path, encoding='utf-8', autodetect_encoding=True)
    else:
        raise ValueError(f'File format {ext} not supported')


def load_document(file_path: str, source_name: str | None = None):
    """
        Detect file path and extract the text.
        source_name: clean display name for metadata (defaults to file basename).
    """
    file_name = source_name or str(os.path.basename(file_path))
    loader = _get_loader(file_path)

    docs = loader.load()

    for doc in docs:
        doc.metadata['source'] = file_name

    return docs


def load_document_lazy(file_path: str, source_name: str | None = None):
    """
    Stream documents page-by-page instead of loading the whole file
    into RAM at once. Use for large documents.
    source_name: clean display name for metadata (defaults to file basename).
    """
    file_name = source_name or str(os.path.basename(file_path))
    loader = _get_loader(file_path)

    # Not every loader implements lazy_load; fall back to load() then
    lazy = getattr(loader, "lazy_load", None)
    docs = lazy() if callable(lazy) else loader.load()

    for doc in docs:
        doc.metadata['source'] = file_name
        yield doc


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


