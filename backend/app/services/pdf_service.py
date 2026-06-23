import io
import logging
from pypdf import PdfReader

logger = logging.getLogger("pdf-service")

class PDFService:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes) -> str:
        """Extract text content from PDF file bytes."""
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            text_content = []
            
            for page_num, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
                    
            extracted_text = "\n".join(text_content).strip()
            
            if not extracted_text:
                logger.warning("No text extracted from PDF. Page count: %d", len(reader.pages))
                
            return extracted_text
        except Exception as e:
            logger.error("Failed to extract text from PDF: %s", str(e), exc_info=True)
            raise ValueError(f"Failed to process PDF file: {str(e)}")

pdf_service = PDFService()
