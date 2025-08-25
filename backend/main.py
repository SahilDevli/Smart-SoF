import os
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import pdfplumber
import re
import pandas as pd
import json
import uuid
from docx import Document
import spacy

# --- Load NLP Model ---
nlp = spacy.load("en_core_web_sm")

# Import your configuration
from config import settings

# Initialize FastAPI app
app = FastAPI(title="Document Processor Backend (ML + NLP Integration)")

# --- CORS Configuration ---
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Startup Event (for directory creation) ---
@app.on_event("startup")
def on_startup():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"Upload directory '{settings.UPLOAD_DIR}' ensured.")


# --- Document Extraction Helpers ---
def pdf_extract(path: Path) -> List[str]:
    lines = []
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    for line in page_text.split('\n'):
                        line = line.strip()
                        if line:
                            lines.append(line)
    except Exception as e:
        print(f"Error extracting PDF: {path} - {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read PDF file: {path.name}. Error: {e}")
    return lines


def extract_docx_lines(path: Path) -> List[str]:
    lines = []
    try:
        document = Document(path)
        for paragraph in document.paragraphs:
            line = paragraph.text.strip()
            if line:
                lines.append(line)
    except Exception as e:
        print(f"Error extracting DOCX: {path} - {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read DOCX file: {path.name}. Error: {e}")
    return lines


def extract_txt_lines(path: Path) -> List[str]:
    lines = []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
    except Exception as e:
        print(f"Error reading TXT file: {path} - {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read TXT file: {path.name}. Error: {e}")
    return lines


# --- ML/NLP Event Parser ---
time_regx = r"\b\d{1,2}:\d{2}(?:\s*hrs|\s*H)?\b"

map_keyword = {
    "Loading": ["load", "commence", "start"],
    "Discharging": ["discharge", "complete", "finish"],
    "Shifting": ["shift"],
    "Anchorage": ["anchorage"]
}

def ml_parse_events(text_lines: List[str]) -> List[dict]:
    identified_events = []
    for line_text in text_lines:
        doc = nlp(line_text)
        sentence_text = line_text.strip()

        # Extract times
        times_found = re.findall(time_regx, sentence_text)
        normalized_times = [
            time.replace("hrs", "").replace("H", "").strip() 
            for time in times_found
        ]

        start_time_val = normalized_times[0] if len(normalized_times) >= 1 else "NULL"
        end_time_val   = normalized_times[1] if len(normalized_times) >= 2 else "NULL"

        # Detect event type
        detected_event = "Other"
        lowered_sentence = sentence_text.lower()
        for event_name, keywords_list in map_keyword.items():
            if any(keyword in lowered_sentence for keyword in keywords_list):
                detected_event = event_name
                break

        # Extract named entities (NER)
        entities = [(ent.text, ent.label_) for ent in doc.ents]

        if start_time_val != "NULL" or detected_event != "Other":
            identified_events.append({
                "id": str(uuid.uuid4()),
                "documentType": "SOF Event",
                "event": detected_event,
                "startTime": start_time_val,
                "endTime": end_time_val,
                "detail": sentence_text,
                "ml_entities": entities
            })
    return identified_events


# --- Unified Schema Entry ---
def create_unified_entry(
    doc_type: str,
    event: str = "",
    startTime: str = "",
    endTime: str = "",
    detail: str = ""
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "documentType": doc_type,
        "event": event,
        "startTime": startTime,
        "endTime": endTime,
        "detail": detail
    }


# --- ML Algorithm Integration ---
def process_documents_with_ml(  
    sof_file_path: Path,
    cp_file_path: Optional[Path] = None,
    additional_file_path: Optional[Path] = None
) -> List[dict]:
    print(f"Processing SOF: {sof_file_path}")
    if cp_file_path:
        print(f"Processing CP: {cp_file_path}")
    if additional_file_path:
        print(f"Processing Additional: {additional_file_path}")

    all_processed_data = []

    # --- SOF Processing ---
    sof_file_extension = sof_file_path.suffix.lower().lstrip('.')
    sof_lines = []
    try:
        if sof_file_extension == 'pdf':
            sof_lines = pdf_extract(sof_file_path)
        elif sof_file_extension == 'docx':
            sof_lines = extract_docx_lines(sof_file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting SOF data from {sof_file_path.name}: {e}")

    if sof_lines:
        extracted_sof_events = ml_parse_events(sof_lines)
        all_processed_data.extend(extracted_sof_events)
    else:
        all_processed_data.append(create_unified_entry(
            doc_type="SOF Report",
            detail="No specific events found or extracted from SOF document."
        ))

    # --- CP Processing (Optional) ---
    if cp_file_path:
        cp_file_extension = cp_file_path.suffix.lower().lstrip('.')
        cp_lines = []
        try:
            if cp_file_extension == 'pdf':
                cp_lines = pdf_extract(cp_file_path)
            elif cp_file_extension == 'docx':
                cp_lines = extract_docx_lines(cp_file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error extracting CP data: {e}")

        if cp_lines:
            all_processed_data.append(create_unified_entry(
                doc_type="CP Detail",
                detail=cp_lines[0][:200] + "..." if cp_lines else "Content present, but no specific details parsed yet."
            ))
        else:
            all_processed_data.append(create_unified_entry(
                doc_type="CP Detail",
                detail="No extractable content found for CP document."
            ))
            
    # Debug save
    if all_processed_data:
        try:
            debug_df = pd.DataFrame(all_processed_data)
            debug_df.to_csv(Path(settings.UPLOAD_DIR) / 'combined_output.csv', index=False)
            with open(Path(settings.UPLOAD_DIR) / 'combined_output.json', "w") as jf:
                json.dump(all_processed_data, jf, indent=4)
            print(f"Combined processed data saved to {settings.UPLOAD_DIR}/combined_output.csv and .json")
        except Exception as e:
            print(f"Error saving debug output: {e}")

    print("ML Processing Complete")
    return all_processed_data


# --- API Endpoints ---
@app.post("/process-documents/", status_code=status.HTTP_202_ACCEPTED)
async def process_documents(
    sof_file: UploadFile = File(...),
    cp_file: Optional[UploadFile] = File(None),
    additional_file: Optional[UploadFile] = File(None),
):
    allowed_sof_cp_ext = ['pdf', 'docx']
    allowed_additional_ext = ['pdf', 'docx', 'txt']

    def validate_file(file: UploadFile, allowed_ext: List[str], file_type_name: str):
        file_extension = Path(file.filename).suffix.lower().lstrip('.')
        if file_extension not in allowed_ext:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type for {file_type_name}. Allowed: {', '.join(allowed_ext)}"
            )
        return file_extension

    validate_file(sof_file, allowed_sof_cp_ext, "Statement of Facts")
    if cp_file:
        validate_file(cp_file, allowed_sof_cp_ext, "Charter Party document")
    if additional_file:
        validate_file(additional_file, allowed_additional_ext, "Additional document")

    sof_file_name = f"{uuid.uuid4()}_{sof_file.filename}"
    sof_file_path = Path(settings.UPLOAD_DIR) / sof_file_name

    cp_file_path: Optional[Path] = None
    if cp_file:
        cp_file_name = f"{uuid.uuid4()}_{cp_file.filename}"
        cp_file_path = Path(settings.UPLOAD_DIR) / cp_file_name

    additional_file_path: Optional[Path] = None
    if additional_file:
        additional_file_name = f"{uuid.uuid4()}_{additional_file.filename}"
        additional_file_path = Path(settings.UPLOAD_DIR) / additional_file_name

    temp_file_paths_to_cleanup: List[Path] = []

    try:
        with sof_file_path.open("wb") as buffer:
            shutil.copyfileobj(sof_file.file, buffer)
        temp_file_paths_to_cleanup.append(sof_file_path)

        if cp_file and cp_file_path:
            with cp_file_path.open("wb") as buffer:
                shutil.copyfileobj(cp_file.file, buffer)
            temp_file_paths_to_cleanup.append(cp_file_path)

        if additional_file and additional_file_path:
            with additional_file_path.open("wb") as buffer:
                shutil.copyfileobj(additional_file.file, buffer)
            temp_file_paths_to_cleanup.append(additional_file_path)

    except Exception as e:
        for path in temp_file_paths_to_cleanup:
            if path.exists():
                os.remove(path)
        raise HTTPException(status_code=500, detail=f"Failed to save files: {e}")

    try:
        processed_data = process_documents_with_ml(sof_file_path, cp_file_path, additional_file_path)

        unified_keys = ["id", "documentType", "event", "startTime", "endTime", "detail", "ml_entities"]
        final_processed_data = []
        for item in processed_data:
            new_item = {key: item.get(key, "") for key in unified_keys}
            final_processed_data.append(new_item)

        return JSONResponse(
            status_code=200,
            content={"message": "Files processed successfully!", "processed_data": final_processed_data}
        )
    finally:
        for path in temp_file_paths_to_cleanup:
            if path.exists():
                os.remove(path)


# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the Document Processor Backend with ML + NLP!"}
