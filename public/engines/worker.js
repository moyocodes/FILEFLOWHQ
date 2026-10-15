// Runs the Studio converter engines (public/engines/<name>/<version>/, built by engines/build.sh)
// off the main thread. Each engine is fetched and compiled on first use, then kept.
//   in:  { id, engine, version, fn, args }
//   out: { id, result } or { id, error }
const engines = {}

function load(engine, version) {
  engines[engine] ||= import(`./${engine}/${version}/engine.js`)
    .then(async (m) => {
      await m.default()
      return m
    })
    .catch((err) => {
      delete engines[engine] // retry on the next call (e.g. the network came back)
      throw err
    })
  return engines[engine]
}

self.onmessage = async ({ data: { id, engine, version, fn, args } }) => {
  try {
    const m = await load(engine, version)
    if (typeof m[fn] !== 'function') throw new Error(`${engine} engine has no ${fn}()`)
    const result = m[fn](...args)
    self.postMessage({ id, result }, result instanceof Uint8Array ? [result.buffer] : [])
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) })
  }
}
