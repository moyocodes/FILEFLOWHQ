//! `convert(bytes, from_name, to_ext)` for the browser: opens a document with wordcraft's engine
//! (docx, doc, odt, rtf, html, md, txt, …) and writes it as `to_ext` (pdf, docx, odt, rtf,
//! html, md, txt) with wordcraft's own page layout — the same as the Word Processor's export.

use wasm_bindgen::prelude::*;
use wordcraft_engine::io;

#[wasm_bindgen]
pub fn convert(bytes: &[u8], from_name: &str, to_ext: &str) -> Result<Vec<u8>, JsError> {
    let doc = io::open_bytes(from_name, bytes).map_err(|e| JsError::new(&e))?;
    io::save_bytes(&format!("out.{to_ext}"), &doc).map_err(|e| JsError::new(&e))
}
