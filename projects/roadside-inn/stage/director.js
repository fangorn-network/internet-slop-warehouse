// SPDX-License-Identifier: CC0-1.0
// Acts: named scenes of one world. go() fades out, runs the old act's exit and the new act's enter (which may await
// whatever it needs loaded), then fades in. Only one transition runs at a time; a second go() waits its turn.
//
//   const director = createDirector({ fx, acts: { dusk, night }, ctx });
//   await director.go('night');
//   director.update(dt)   // every frame: the current act's update(dt, ctx)
//
// An act: { enter(ctx), exit(ctx), update(dt, ctx), fadeOut = 1.2, fadeIn = 1.6 }; every field optional.
export function createDirector({ fx, acts, ctx }) {
  let current = null, name = null, queue = Promise.resolve();
  return {
    get name() { return name; },
    get act() { return current; },
    go(next, { fadeOut, fadeIn } = {}) {
      queue = queue.then(async () => {
        const act = acts[next];
        if (!act) throw Error(`no act named ${next}`);
        if (current) await fx.to({ fade: 1 }, fadeOut ?? act.fadeOut ?? 1.2);
        await current?.exit?.(ctx);
        current = act; name = next;
        await act.enter?.(ctx);
        await fx.to({ fade: 0 }, fadeIn ?? act.fadeIn ?? 1.6);
      });
      return queue;
    },
    update(dt) { current?.update?.(dt, ctx); },
  };
}
