//! FileFlowHQ brand, shared by every FileFlowHQ Studio editor.
//!
//! Source of truth: `file-convert-hub/studio/brand/ffhq_brand/` — the build script
//! (`scripts/build-branded-studio-app.sh`) copies this folder into each editor's UI crate as
//! `src/ffhq_brand/` before building, so a change here reaches every editor. Edit it there, not in
//! an editor checkout. The logos are raw RGBA pixels rendered from the website's SVGs by
//! `studio/brand/render.mjs`, so editors need no SVG or PNG decoder.
//!
//! - [`mark`]: the short logo (the green "F"), for bars and small spaces.
//! - [`wordmark`]: the long logo ("FileFlowHQ"), in the colours for the current light/dark UI.
//! - [`start_header`]: the start screen's heading: the long logo, then the editor's name and a
//!   line on what it does — the same on every editor.

#![allow(dead_code)] // each editor uses the parts it needs

use egui::{Color32, ColorImage, Context, Id, Image, Rect, Response, RichText, Sense, TextureHandle, TextureOptions, Ui, Vec2, load::SizedTexture, pos2};

struct Asset {
    id: &'static str,
    rgba: &'static [u8],
    size: [usize; 2],
}

const MARK: Asset = Asset { id: "ffhq-brand-mark", rgba: include_bytes!("mark.rgba"), size: [155, 96] };
/// White lettering, for dark interfaces.
const WORDMARK_DARK_UI: Asset = Asset { id: "ffhq-brand-wordmark-dark", rgba: include_bytes!("wordmark-dark-ui.rgba"), size: [441, 112] };
/// Dark lettering, for light interfaces.
const WORDMARK_LIGHT_UI: Asset = Asset { id: "ffhq-brand-wordmark-light", rgba: include_bytes!("wordmark-light-ui.rgba"), size: [441, 112] };

/// The asset's texture, uploaded on first use and kept in the context (mipmapped, so it stays
/// crisp at any size).
fn texture(ctx: &Context, a: &Asset) -> TextureHandle {
    let id = Id::new(a.id);
    if let Some(tex) = ctx.data(|d| d.get_temp::<TextureHandle>(id)) {
        return tex;
    }
    let image = if a.rgba.len() == a.size[0] * a.size[1] * 4 {
        ColorImage::from_rgba_unmultiplied(a.size, a.rgba)
    } else {
        ColorImage::filled([1, 1], Color32::TRANSPARENT)
    };
    let options = TextureOptions { mipmap_mode: Some(egui::TextureFilter::Linear), ..TextureOptions::LINEAR };
    let tex = ctx.load_texture(a.id, image, options);
    ctx.data_mut(|d| d.insert_temp(id, tex.clone()));
    tex
}

fn logo(ui: &mut Ui, a: &Asset, height: f32) -> Response {
    let tex = texture(ui.ctx(), a);
    let size = Vec2::new(height * a.size[0] as f32 / a.size[1] as f32, height);
    let resp = ui.add(Image::new(SizedTexture::new(tex.id(), size)).sense(Sense::click()));
    resp.widget_info(|| egui::WidgetInfo::labeled(egui::WidgetType::Image, true, "FileFlowHQ"));
    resp
}

/// The short logo (the green "F"), `height` points tall.
pub fn mark(ui: &mut Ui, height: f32) -> Response {
    logo(ui, &MARK, height)
}

/// Paints the short logo inside `rect`, as large as fits and centred (for bars an editor lays
/// out with its own painter). Every editor's bar starts with it, right before File.
pub fn paint_mark(ui: &Ui, rect: Rect) {
    let tex = texture(ui.ctx(), &MARK);
    let aspect = MARK.size[0] as f32 / MARK.size[1] as f32;
    let size = if rect.width() / rect.height() > aspect { Vec2::new(rect.height() * aspect, rect.height()) } else { Vec2::new(rect.width(), rect.width() / aspect) };
    let uv = Rect::from_min_max(pos2(0.0, 0.0), pos2(1.0, 1.0));
    ui.painter().image(tex.id(), Rect::from_center_size(rect.center(), size), uv, Color32::WHITE);
}

/// The long logo ("FileFlowHQ"), `height` points tall, lettered for the current light or dark UI.
pub fn wordmark(ui: &mut Ui, height: f32) -> Response {
    let a = if ui.visuals().dark_mode { &WORDMARK_DARK_UI } else { &WORDMARK_LIGHT_UI };
    logo(ui, a, height)
}

/// The start screen's heading, the same on every editor: the long logo, the editor's name
/// (`editor`, such as "Photo Editor") and one line on what it does. It follows the surrounding
/// layout (left-aligned, or centred inside `vertical_centered`).
pub fn start_header(ui: &mut Ui, editor: &str, tagline: &str) {
    ui.scope(|ui| {
        wordmark(ui, 30.0);
        ui.add_space(14.0);
        ui.label(RichText::new(editor).size(26.0).strong().color(ui.visuals().strong_text_color()));
        ui.add_space(2.0);
        ui.label(RichText::new(tagline).size(14.0).color(ui.visuals().weak_text_color()));
    });
}
