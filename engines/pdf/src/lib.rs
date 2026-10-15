//! `convert(pdf_bytes, format)` for the browser: opens the PDF with pdfcraft's engine and
//! exports it as "docx", "pptx", "html" or "rtf" — the same export the PDF editor uses.

use std::sync::Arc;

use pdfcraft_engine::Session;
use pdfcraft_engine::compare::OfficeFormat;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn convert(pdf: &[u8], format: &str) -> Result<Vec<u8>, JsError> {
    let format = OfficeFormat::from_extension(format).ok_or_else(|| JsError::new(&format!("unsupported format: {format}")))?;
    let mut session = Session::new();
    let id = session
        .open("document.pdf", None, Arc::new(pdf.to_vec()), None)
        .map_err(|e| JsError::new(&format!("couldn't open this PDF: {e:?}")))?;
    let doc = session.get(id).ok_or_else(|| JsError::new("couldn't open this PDF"))?;
    Ok(doc.export_office(format))
}

/// Page count, for progress and sanity checks.
#[wasm_bindgen]
pub fn page_count(pdf: &[u8]) -> Result<usize, JsError> {
    let mut session = Session::new();
    let id = session
        .open("document.pdf", None, Arc::new(pdf.to_vec()), None)
        .map_err(|e| JsError::new(&format!("couldn't open this PDF: {e:?}")))?;
    Ok(session.get(id).map_or(0, |d| d.info.pages.len()))
}
