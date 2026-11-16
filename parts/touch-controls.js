// On-screen controls for phones and tablets: a thumb joystick and buttons that press keyboard keys, so any game
// driven by the keyboard (WASD, Shift, Space) plays by touch without a change. Shows itself on touch screens only.

export function attach(root = document.body, {
    always = false, runAt = 0.85, dead = 0.3, size = 120,
    stick = { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", run: "ShiftLeft" },
    buttons = [{ label: "jump", code: "Space" }],
    press = (code, down) => dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, key: code, bubbles: true })),
} = {}) {
    const ui = document.createElement("div"), held = new Set();
    ui.style.cssText = "position:fixed;inset:auto 0 0 0;height:45vh;z-index:10;touch-action:none;user-select:none;-webkit-user-select:none;pointer-events:none";
    const pad = document.createElement("div"), knob = document.createElement("div");
    pad.style.cssText = `position:absolute;left:24px;bottom:24px;width:${size}px;height:${size}px;border-radius:50%;background:#fff2;border:2px solid #fff6;pointer-events:auto;touch-action:none`;
    knob.style.cssText = `position:absolute;left:50%;top:50%;width:${size / 2.4}px;height:${size / 2.4}px;margin:-${size / 4.8}px;border-radius:50%;background:#fff8`;
    pad.append(knob); ui.append(pad);
    const set = (code, on) => { if (on === held.has(code)) return; on ? held.add(code) : held.delete(code); press(code, on); };
    let sid = null;
    const move = (e) => {
        if (e.pointerId !== sid) return;
        const r = pad.getBoundingClientRect(), half = r.width / 2;
        let x = (e.clientX - r.left - half) / half, y = (e.clientY - r.top - half) / half;
        const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
        knob.style.transform = `translate(${x * half * 0.6}px, ${y * half * 0.6}px)`;
        set(stick.up, y < -dead); set(stick.down, y > dead); set(stick.left, x < -dead); set(stick.right, x > dead);
        if (stick.run) set(stick.run, m > runAt);
    };
    const release = (e) => {
        if (e.pointerId !== sid) return; sid = null; knob.style.transform = "";
        for (const c of Object.values(stick)) if (c) set(c, false);
    };
    pad.addEventListener("pointerdown", (e) => { sid = e.pointerId; pad.setPointerCapture(e.pointerId); move(e); e.preventDefault(); });
    pad.addEventListener("pointermove", move); pad.addEventListener("pointerup", release); pad.addEventListener("pointercancel", release);
    buttons.forEach(({ label, code }, i) => {
        const b = document.createElement("div"); b.textContent = label;
        b.style.cssText = `position:absolute;right:${24 + i * 90}px;bottom:${40 + (i % 2) * 70}px;width:76px;height:76px;border-radius:50%;background:#fff3;border:2px solid #fff7;color:#fff;font:600 14px system-ui;display:grid;place-items:center;pointer-events:auto;touch-action:none`;
        b.addEventListener("pointerdown", (e) => { set(code, true); e.preventDefault(); });
        for (const ev of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(ev, () => set(code, false));
        ui.append(b);
    });
    const touch = always || matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (touch) root.append(ui);
    return {
        /** true when the controls are showing */
        shown: touch,
        update() {},
        dispose() { for (const c of held) press(c, false); held.clear(); ui.remove(); },
    };
}
