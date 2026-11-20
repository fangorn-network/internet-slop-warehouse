// intent: routes follow the walk graph, needs pick the activity, a done activity meets its need and isn't repeated
// at once, and beats (pour, then hold the cup) become separate stops at the same spot.
import { test, expect } from "vitest";
import { route, mind } from "./intent.js";

const world = {
  nodes: { a: [0, 0, 0], b: [5, 0, 0], c: [5, 0, 5], d: [0, 3, 0] },
  edges: [["a", "b"], ["b", "c"], ["a", "d"]],
  places: { bar: { p: [5, 0, 5.5], node: "c", face: Math.PI }, room: { p: [0.5, 0, -0.5], node: "a", hide: true } },
};
const ray = {
  start: "room", needs: { coffee: { level: 1, rate: 0.01 } },
  activities: {
    coffee: { need: "coffee", weight: 2, steps: [["go", "bar"], ["wait", 5], ["hold", true], ["wait", 2], ["go", "room"], ["wait", 30]], satisfies: { coffee: 1 } },
    idle: { weight: 1, steps: [["wait", 3]] },
  },
};

test("a route walks the graph's edges from the nearest node", () => {
  expect(route(world, [0.2, 0, 0.1], "c")).toEqual([[0, 0, 0], [5, 0, 0], [5, 0, 5]]);
  expect(route(world, [0, 3, 0.2], "b")).toEqual([[0, 3, 0], [0, 0, 0], [5, 0, 0]]);   // the floor above is its own node
});

test("needs choose, beats split, and a met need gives way", () => {
  const m = mind(ray, world);
  const s = m.next([0.5, 0, -0.5]);
  expect(m.state.doing).toBe("coffee");
  const bar = s.filter(x => x.p[2] === 5.5);
  expect(bar).toHaveLength(2);
  expect(bar[0]).toMatchObject({ wait: 5, face: Math.PI });
  expect(bar[1]).toMatchObject({ wait: 2, cup: true });
  expect(s.at(-1)).toMatchObject({ hide: true, wait: 30 });
  m.next([0.5, 0, -0.5]);
  expect(m.state.needs.coffee.level).toBe(0);
  expect(m.state.doing).toBe("idle");
});
