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

// ---- Export vs save ------------------------------------------------------------------------------
//
// In FileFlowHQ Studio a save is kept in the browser and an export is downloaded (and paid for).
// The web shell can't tell them apart from the bytes alone (File › Export can write the same
// format Save does), so the UI marks the writes that are exports.

static EXPORTING: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// Run `write` as an export: files it hands to the host count as exports, not saves.
pub fn as_export<R>(write: impl FnOnce() -> R) -> R {
    let was = EXPORTING.swap(true, std::sync::atomic::Ordering::Relaxed);
    let r = write();
    EXPORTING.store(was, std::sync::atomic::Ordering::Relaxed);
    r
}

/// Whether the file being written now is an export (see [`as_export`]).
pub fn is_export() -> bool {
    EXPORTING.load(std::sync::atomic::Ordering::Relaxed)
}

// ---- Page kit ------------------------------------------------------------------------------------
//
// The look of fileflowhq.com for an editor's own pages (File/Backstage, start screens): the site's
// colour tokens (src/index.css), 18 px cards, pill buttons and a green-tinted pill for the current
// item. Fonts come from the editor (each bundles its own faces).

/// The site's colour tokens for the current light/dark mode.
#[derive(Clone, Copy)]
pub struct Palette {
    pub void: Color32,
    pub panel: Color32,
    pub raised: Color32,
    pub border: Color32,
    pub border_strong: Color32,
    pub text: Color32,
    pub dim: Color32,
    pub signal: Color32,
    pub signal_dim: Color32,
    pub on_signal: Color32,
}

pub fn palette(ctx: &Context) -> Palette {
    let rgb = Color32::from_rgb;
    if ctx.global_style().visuals.dark_mode {
        Palette {
            void: rgb(0x12, 0x17, 0x18),
            panel: rgb(0x1A, 0x20, 0x21),
            raised: rgb(0x22, 0x2A, 0x2A),
            border: rgb(0x29, 0x32, 0x2F),
            border_strong: rgb(0x35, 0x41, 0x3D),
            text: rgb(0xF1, 0xF5, 0xF3),
            dim: rgb(0xA3, 0xAF, 0xAB),
            signal: rgb(0x3B, 0xE6, 0x98),
            signal_dim: Color32::from_rgba_unmultiplied(0x3B, 0xE6, 0x98, 0x1F),
            on_signal: rgb(0x0B, 0x0F, 0x0F),
        }
    } else {
        Palette {
            void: rgb(0xF4, 0xF6, 0xF5),
            panel: Color32::WHITE,
            raised: rgb(0xEE, 0xF2, 0xF0),
            border: rgb(0xE6, 0xEB, 0xE8),
            border_strong: rgb(0xD3, 0xDB, 0xD6),
            text: rgb(0x10, 0x15, 0x1A),
            dim: rgb(0x5B, 0x66, 0x70),
            signal: rgb(0x0E, 0x8F, 0x5C),
            signal_dim: Color32::from_rgba_unmultiplied(0x0E, 0x8F, 0x5C, 0x1A),
            on_signal: Color32::WHITE,
        }
    }
}

/// The site's card radius.
pub const CARD_RADIUS: f32 = 18.0;

/// A page's heading: the title, then a dimmed line under it.
pub fn page_heading(ui: &mut Ui, title: &str, subtitle: &str, title_font: egui::FontId, body_font: egui::FontId) {
    let p = palette(ui.ctx());
    ui.label(RichText::new(title).font(title_font).color(p.text));
    if !subtitle.is_empty() {
        ui.add_space(6.0);
        ui.label(RichText::new(subtitle).font(body_font).color(p.dim));
    }
    ui.add_space(22.0);
}

/// A navigation entry: a full-width row with a rounded tinted pill when it is the current one.
pub fn nav_item(ui: &mut Ui, label: &str, active: bool, font: egui::FontId, width: f32) -> Response {
    let p = palette(ui.ctx());
    let (row, resp) = ui.allocate_exact_size(Vec2::new(width, 40.0), Sense::click());
    resp.widget_info(|| egui::WidgetInfo::labeled(egui::WidgetType::Button, true, label));
    let pill = row.shrink2(Vec2::new(10.0, 3.0));
    if active {
        ui.painter().rect_filled(pill, 12.0, p.signal_dim);
    } else if resp.hovered() {
        ui.painter().rect_filled(pill, 12.0, p.raised);
    }
    let color = if active { p.signal } else { p.text };
    ui.painter().text(pos2(pill.min.x + 14.0, pill.center().y), egui::Align2::LEFT_CENTER, label, font, color);
    resp.on_hover_cursor(egui::CursorIcon::PointingHand)
}

/// A pill button: `primary` is filled with the brand green, otherwise a quiet raised pill.
pub fn pill_button(ui: &mut Ui, label: &str, primary: bool, font: egui::FontId) -> Response {
    pill_button_sized(ui, label, primary, font, 40.0)
}

/// [`pill_button`] at another height (a compact one for bars).
pub fn pill_button_sized(ui: &mut Ui, label: &str, primary: bool, font: egui::FontId, height: f32) -> Response {
    let p = palette(ui.ctx());
    let galley = ui.painter().layout_no_wrap(label.to_string(), font, if primary { p.on_signal } else { p.text });
    let size = Vec2::new(galley.size().x + height * 0.9, height);
    let (r, resp) = ui.allocate_exact_size(size, Sense::click());
    resp.widget_info(|| egui::WidgetInfo::labeled(egui::WidgetType::Button, true, label));
    let fill = match (primary, resp.hovered()) {
        (true, false) => p.signal,
        (true, true) => p.signal.gamma_multiply(0.88),
        (false, false) => p.raised,
        (false, true) => p.border,
    };
    ui.painter().rect_filled(r, height / 2.0, fill);
    ui.painter().galley(r.center() - galley.size() / 2.0, galley, p.text);
    resp.on_hover_cursor(egui::CursorIcon::PointingHand)
}

/// A clickable card for one choice (an export format, a recent file…): a small badge, a title and
/// a dimmed line, with the border turning green on hover.
pub fn option_card(ui: &mut Ui, size: Vec2, badge: &str, title: &str, subtitle: &str, title_font: egui::FontId, small_font: egui::FontId) -> Response {
    let p = palette(ui.ctx());
    let (r, resp) = ui.allocate_exact_size(size, Sense::click());
    resp.widget_info(|| egui::WidgetInfo::labeled(egui::WidgetType::Button, true, title));
    let hovered = resp.hovered();
    ui.painter().rect(
        r,
        CARD_RADIUS,
        if hovered { p.raised } else { p.panel },
        egui::Stroke::new(1.0, if hovered { p.signal } else { p.border }),
        egui::StrokeKind::Inside,
    );
    let chip = Rect::from_min_size(pos2(r.min.x + 16.0, r.center().y - 20.0), Vec2::splat(40.0));
    ui.painter().rect_filled(chip, 12.0, p.signal_dim);
    ui.painter().text(chip.center(), egui::Align2::CENTER_CENTER, badge, small_font.clone(), p.signal);
    let x = chip.max.x + 14.0;
    let width = r.max.x - x - 14.0;
    let clip = Rect::from_min_max(pos2(x, r.min.y), pos2(r.max.x - 10.0, r.max.y));
    let painter = ui.painter().with_clip_rect(clip);
    if subtitle.is_empty() {
        painter.text(pos2(x, r.center().y), egui::Align2::LEFT_CENTER, title, title_font, p.text);
    } else {
        painter.text(pos2(x, r.center().y - 9.0), egui::Align2::LEFT_CENTER, title, title_font, p.text);
        let sub = painter.layout(subtitle.to_string(), small_font, p.dim, width);
        let row = sub.rows.first().map_or(0.0, |row| row.height());
        painter.galley(pos2(x, r.center().y + 9.0 - row / 2.0), sub, p.dim);
    }
    resp.on_hover_cursor(egui::CursorIcon::PointingHand)
}

/// A card to put content in (forms, lists): the panel colour, a hairline border, 18 px corners.
pub fn card(ctx: &Context) -> egui::Frame {
    let p = palette(ctx);
    egui::Frame::NONE.fill(p.panel).stroke(egui::Stroke::new(1.0, p.border)).corner_radius(CARD_RADIUS).inner_margin(20.0)
}

static SAVING: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// Run `write` as a save, for editors where every other write is an export (the PDF editor).
pub fn as_save<R>(write: impl FnOnce() -> R) -> R {
    let was = SAVING.swap(true, std::sync::atomic::Ordering::Relaxed);
    let r = write();
    SAVING.store(was, std::sync::atomic::Ordering::Relaxed);
    r
}

/// Whether the file being written now is a save (see [`as_save`]).
pub fn is_save() -> bool {
    SAVING.load(std::sync::atomic::Ordering::Relaxed)
}

/// Paints the long logo `height` points tall with its left edge at `left_center` (for editors
/// that lay out with their own painter). Returns the rect it took.
pub fn paint_wordmark(ui: &Ui, left_center: egui::Pos2, height: f32, dark: bool) -> Rect {
    let a = if dark { &WORDMARK_DARK_UI } else { &WORDMARK_LIGHT_UI };
    let tex = texture(ui.ctx(), a);
    let size = Vec2::new(height * a.size[0] as f32 / a.size[1] as f32, height);
    let r = Rect::from_min_size(pos2(left_center.x, left_center.y - height / 2.0), size);
    ui.painter().image(tex.id(), r, Rect::from_min_max(pos2(0.0, 0.0), pos2(1.0, 1.0)), Color32::WHITE);
    r
}
