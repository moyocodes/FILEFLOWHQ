//! Image conversion for the browser with photocraft's readers and codecs — the same as the Photo
//! Editor's File › Open and Export As. Reads PNG, JPEG, WebP, GIF, TIFF, BMP, HEIC/HEIF, AVIF,
//! camera RAW (DNG, CR2/CR3, NEF, ARW, …), PSD/PSB, EXR, HDR, TGA, ICO, QOI, SVG and more.

use photocraft_io::{ExportOptions, XmpEmbed, export, import};
use wasm_bindgen::prelude::*;

/// Convert `bytes` (a file named `name`, whose extension picks the reader) to `to_ext`.
/// `quality` (1–100) sets JPEG/WebP quality; 0 keeps the codec default. `strip_metadata` drops
/// EXIF/XMP (camera, location) from the output.
#[wasm_bindgen]
pub fn convert(bytes: &[u8], name: &str, to_ext: &str, quality: u8, strip_metadata: bool) -> Result<Vec<u8>, JsError> {
    let doc = import(name, bytes).map_err(|e| JsError::new(&e.to_string()))?.document;
    let mut opts = ExportOptions::default();
    if (1..=100).contains(&quality) {
        opts.encode.jpeg_quality = quality;
        opts.encode.webp_quality = quality;
        opts.encode.webp_lossless = false;
    }
    if strip_metadata {
        opts.xmp = XmpEmbed::None;
        opts.encode.embed_metadata = false;
    }
    let out = export(&doc, &format!("out.{to_ext}"), &opts).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(out.bytes)
}

/// `[width, height]` of the image, for previews and size checks.
#[wasm_bindgen]
pub fn dimensions(bytes: &[u8], name: &str) -> Result<Vec<u32>, JsError> {
    let doc = import(name, bytes).map_err(|e| JsError::new(&e.to_string()))?.document;
    Ok(vec![doc.size.width, doc.size.height])
}
