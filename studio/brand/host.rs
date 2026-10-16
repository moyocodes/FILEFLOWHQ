//! FileFlowHQ host bridge: the editor talks to the fileflowhq.com page that embeds it (same
//! origin, in an iframe). Shared by every FileFlowHQ-branded Studio editor: the source of truth is
//! `file-convert-hub/studio/brand/host.rs`; each editor's web shell has a copy as `src/host.rs`.
//!
//! To the page:  `pdfcraft:ready` once running, `pdfcraft:failed` `{ error }` if it couldn't
//!               start, `ffhq:export` `{ name, bytes, kind }` for every file the editor writes
//!               (`kind`: `save` and `autosave` are kept in the browser, `export` downloads and
//!               is paid for), `ffhq:dirty` `{ dirty }` when unsaved changes come or go, and
//!               `ffhq:autosave` `{ on }` when the editor's own AutoSave switch changes.
//! From the page: `pdfcraft:open` `{ name, bytes }` opens a file, `ffhq:theme` `{ theme }` switches
//!               light/dark, `ffhq:autosave` `{ on }` turns AutoSave on or off, and `ffhq:save`
//!               saves now.
//!
//! Opened on its own (not embedded), the editor works but can't save or export.

use std::cell::{Cell, RefCell};

use js_sys::{Array, Object, Reflect, Uint8Array};
use wasm_bindgen::{JsCast as _, JsValue, closure::Closure};

/// What the page asked for since the last [`take_requests`].
#[derive(Default)]
pub struct Requests {
    /// `Some(true)` for dark.
    pub dark: Option<bool>,
    pub autosave: Option<bool>,
    pub save: bool,
}

thread_local! {
    static REQUESTS: RefCell<Requests> = RefCell::default();
    static DIRTY: Cell<Option<bool>> = const { Cell::new(None) };
    static AUTOSAVING: Cell<bool> = const { Cell::new(false) };
    /// When AutoSave last saved (ms), and whether it is on.
    static AUTOSAVE: Cell<(bool, f64)> = const { Cell::new((false, 0.0)) };
    /// When the visitor last typed, clicked or scrolled (ms): AutoSave waits for a pause, so it
    /// never interrupts typing (a save commits the text being edited).
    static LAST_INPUT: Cell<f64> = const { Cell::new(0.0) };
}

/// The embedding page's window: a different window than ours, on our own origin.
fn parent() -> Option<web_sys::Window> {
    let window = web_sys::window()?;
    let parent = window.parent().ok().flatten()?;
    if Object::is(&parent, &window) {
        return None;
    }
    // Reading another origin's location throws: that page isn't ours.
    let theirs = parent.location().origin().ok()?;
    (theirs == window.location().origin().ok()?).then_some(parent)
}

/// Whether a FileFlowHQ page embeds the editor.
#[allow(dead_code)] // not every editor asks
pub fn embedded() -> bool {
    parent().is_some()
}

fn message(fields: &[(&str, JsValue)]) -> Option<Object> {
    let o = Object::new();
    for (k, v) in fields {
        Reflect::set(&o, &JsValue::from_str(k), v).ok()?;
    }
    Some(o)
}

fn post(fields: &[(&str, JsValue)], transfer: Option<&JsValue>) -> Result<(), String> {
    let parent = parent().ok_or("not embedded in fileflowhq.com")?;
    let origin = web_sys::window().and_then(|w| w.location().origin().ok()).ok_or("no origin")?;
    let m = message(fields).ok_or("couldn't build the message")?;
    match transfer {
        Some(t) => parent.post_message_with_transfer(&m, &origin, &Array::of1(t)),
        None => parent.post_message(&m, &origin),
    }
    .map_err(|e| format!("{e:?}"))
}

pub fn post_ready() {
    let _ = post(&[("type", "pdfcraft:ready".into())], None);
}

pub fn post_failed(error: &str) {
    let _ = post(&[("type", "pdfcraft:failed".into()), ("error", error.into())], None);
}

/// Hand a file the editor wrote to the page (`ffhq:export`). `export` is true for File › Export
/// and printing (downloaded, paid); otherwise it is a save, kept in the browser. The bytes move.
pub fn export(name: &str, bytes: &[u8], export: bool) -> Result<(), String> {
    let kind = if export {
        "export"
    } else if AUTOSAVING.get() {
        "autosave"
    } else {
        "save"
    };
    let buffer = Uint8Array::from(bytes).buffer();
    post(&[("type", "ffhq:export".into()), ("name", name.into()), ("bytes", buffer.clone().into()), ("kind", kind.into())], Some(&buffer))
}

/// Tell the page whether there are unsaved changes (sent only when that changes).
pub fn report_dirty(dirty: bool) {
    if DIRTY.replace(Some(dirty)) != Some(dirty) {
        let _ = post(&[("type", "ffhq:dirty".into()), ("dirty", dirty.into())], None);
    }
}

/// Tell the page the editor's own AutoSave switch changed.
#[allow(dead_code)] // only editors with their own switch
pub fn report_autosave(on: bool) {
    AUTOSAVE.set((on, AUTOSAVE.get().1));
    let _ = post(&[("type", "ffhq:autosave".into()), ("on", on.into())], None);
}

/// What the page asked for since the last call (call once per frame).
pub fn take_requests() -> Requests {
    let r = REQUESTS.take();
    if let Some(on) = r.autosave {
        AUTOSAVE.set((on, AUTOSAVE.get().1));
    }
    r
}

/// Whether to save now: the page asked (`save`), or AutoSave is on, there are unsaved changes, the
/// last AutoSave was a few seconds ago and the visitor has paused (no typing or clicking for 3 s).
/// Run the save inside [`autosaving`] when this says so.
pub fn should_save(requested: bool, dirty: bool) -> bool {
    let (on, last) = AUTOSAVE.get();
    let now = js_sys::Date::now();
    let paused = now - LAST_INPUT.get() > 3000.0;
    if requested || (on && dirty && paused && now - last > 4000.0) {
        AUTOSAVE.set((on, now));
        return true;
    }
    false
}

/// Run `save` as an AutoSave (the page keeps it quietly).
pub fn autosaving<R>(save: impl FnOnce() -> R) -> R {
    AUTOSAVING.set(true);
    let r = save();
    AUTOSAVING.set(false);
    r
}

/// Calls `open(name, bytes)` for every `pdfcraft:open` the page sends, keeps the other requests for
/// [`take_requests`], and calls `wake` after any of them (to repaint).
pub fn listen(mut open: impl FnMut(String, Vec<u8>) + 'static, wake: impl Fn() + 'static) {
    let Some(window) = web_sys::window() else { return };
    let own_origin = window.location().origin().unwrap_or_default();
    let cb = Closure::<dyn FnMut(web_sys::MessageEvent)>::new(move |e: web_sys::MessageEvent| {
        let from_parent = match (parent(), e.source()) {
            (Some(p), Some(src)) => Object::is(&p, &src),
            _ => false,
        };
        if !from_parent || e.origin() != own_origin {
            return;
        }
        let data = e.data();
        let get = |k: &str| Reflect::get(&data, &JsValue::from_str(k)).ok();
        match get("type").and_then(|t| t.as_string()).as_deref() {
            Some("pdfcraft:open") => {
                if let (Some(name), Some(bytes)) = (get("name").and_then(|n| n.as_string()), get("bytes")) {
                    open(name, Uint8Array::new(&bytes).to_vec());
                }
            }
            Some("ffhq:theme") => {
                let dark = get("theme").and_then(|t| t.as_string()).as_deref() != Some("light");
                REQUESTS.with_borrow_mut(|r| r.dark = Some(dark));
            }
            Some("ffhq:autosave") => {
                let on = get("on").and_then(|v| v.as_bool()).unwrap_or(false);
                REQUESTS.with_borrow_mut(|r| r.autosave = Some(on));
            }
            Some("ffhq:save") => REQUESTS.with_borrow_mut(|r| r.save = true),
            _ => return,
        }
        wake();
    });
    if window.add_event_listener_with_callback("message", cb.as_ref().unchecked_ref()).is_ok() {
        cb.forget();
    }
    // Typing, clicking and scrolling hold AutoSave back (see `should_save`).
    let input = Closure::<dyn FnMut()>::new(|| LAST_INPUT.set(js_sys::Date::now()));
    for event in ["keydown", "pointerdown", "pointerup", "wheel", "compositionupdate"] {
        let _ = window.add_event_listener_with_callback(event, input.as_ref().unchecked_ref());
    }
    input.forget();
}

/// Whether AutoSave is on (the Studio bar's switch, or the editor's own).
#[allow(dead_code)] // only editors that gate their own background saving on it
pub fn autosave_on() -> bool {
    AUTOSAVE.get().0
}
