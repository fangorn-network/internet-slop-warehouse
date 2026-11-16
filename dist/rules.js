// projects/mairas-dream/stock.js
const shelves = [...[-11, -7.5].flatMap((x, c) => [-10, -7.2].map((z, m) => ({
	id: `media-${c}-${m}`,
	x,
	z,
	section: "media",
	rotation: 0,
	theme: "books"
}))), ...[
	5,
	9.1,
	13.2
].flatMap((x, b) => [
	-8.6,
	-5.9,
	-3.2
].flatMap((z, m) => [-1, 1].map((face) => ({
	id: `bank-${b}-${m}-${face}`,
	x: x + face * .39,
	z,
	section: b === 1 ? m === 0 ? "hardware" : "electrics" : "home",
	rotation: face * Math.PI / 2,
	bank: b,
	module: m,
	theme: b === 0 ? [
		"china",
		"cups",
		"decor"
	][(m + (face === 1 ? 1 : 0)) % 3] : b === 2 ? [
		"cookware",
		"china",
		"decor"
	][(m + (face === 1 ? 1 : 0)) % 3] : m === 0 ? "tools" : "appliances"
}))))];
const racks = [
	-11,
	-6.6,
	-2.2
].flatMap((x, c) => [
	5.3,
	2.5,
	-.3,
	-3.1
].map((z, r) => ({
	id: `rack-${c}-${r}`,
	x,
	z,
	section: c === 0 ? r === 0 ? "Men’s · trousers" : "Men’s · shirts" : c === 1 ? r === 0 ? "Women’s · casual" : "Women’s · formal" : "Children",
	round: c === 2 && r === 0
})));
const specials = [
	{
		id: "hanger",
		name: "Wire clothes hanger",
		kind: "hanger",
		price: 125,
		section: "Men’s · accessories",
		x: -9.45,
		z: 5.3,
		y: 1.15,
		scale: 1,
		detail: "One previous shirt. No questions asked."
	},
	{
		id: "hammer",
		name: "Nearly straight hammer",
		kind: "hammer",
		price: 650,
		section: "Hardware",
		x: 8.51,
		z: -8.2,
		faceRotation: -Math.PI / 2,
		y: 1.32,
		pitch: Math.PI / 2,
		scale: 1,
		detail: "Three sheds and a divorce. Still mostly straight."
	},
	{
		id: "mug",
		name: "World’s Okayest Neighbor",
		kind: "neighbor-mug",
		price: 225,
		section: "Housewares",
		x: 5.59,
		z: -5.72,
		faceRotation: Math.PI / 2,
		y: 1.32,
		scale: 1,
		detail: "For a carefully measured friendship."
	},
	{
		id: "plate",
		name: "Floral dinner plate",
		kind: "plate",
		price: 175,
		section: "Housewares",
		x: 8.51,
		z: -3,
		faceRotation: -Math.PI / 2,
		y: 1.32,
		scale: .75,
		detail: "Dishwasher uncertain. Dinner possible."
	},
	{
		id: "lamp",
		name: "Avocado table lamp",
		kind: "desk-lamp",
		price: 899,
		section: "Electronics",
		x: .2,
		z: -6.2,
		y: .78,
		scale: 1,
		detail: "Tested. Makes light. No other promises."
	},
	{
		id: "radio",
		name: "AM / FM / probably ghosts",
		kind: "boombox",
		price: 799,
		section: "Electronics",
		x: 4.41,
		z: -3.15,
		faceRotation: -Math.PI / 2,
		y: 1.32,
		scale: .8,
		detail: "Picks up the weather from 1987."
	},
	{
		id: "book",
		name: "A Shed of One’s Own",
		kind: "book",
		price: 250,
		section: "Books & media",
		x: -7.4,
		z: -9.74,
		y: 1.39,
		scale: 1,
		detail: "Chapter one: a hammer. Chapter two: optimism."
	},
	{
		id: "shirt",
		name: "Emergency dinner shirt",
		kind: "shirt",
		price: 499,
		section: "Women’s · casual",
		x: -6.6,
		z: 5.95,
		y: .73,
		scale: 1,
		detail: "Presentable enough. Interesting enough to leave early."
	},
	{
		id: "trousers",
		name: "Perfectly adequate trousers",
		kind: "trousers",
		price: 599,
		section: "Men’s · trousers",
		x: -11,
		z: 5.95,
		y: .52,
		scale: 1,
		detail: "Contains the standard number of legs."
	}
];
const names = {
	transceiver: ["Shortwave receiver", "Radio with too many knobs"],
	"watering-can": ["Small metal watering can"],
	"horse-statue": ["Someone’s equestrian phase"],
	lantern: ["Old camping lantern"],
	teapot: ["Floral porcelain teapot", "Tea for unexpected company"],
	"tea-mug": ["Handled floral tea cup", "An almost matching cup"],
	"sugar-bowl": ["Lidded sugar bowl", "Sugar, if you insist"],
	"square-plate": ["Square floral plate", "The other wedding china"],
	saucer: ["Orphaned floral saucer", "Tea set survivor"],
	bust: ["Someone important, probably", "Retired philosopher"],
	"cat-statue": ["A suspiciously quiet cat", "Concrete cat, house trained"],
	"oil-lamp": ["Lamp for a slower century", "Vintage oil lamp"],
	"book-alt": [
		"A Very Long Weekend",
		"Classic Poems",
		"The Unfinished Cookbook"
	],
	teacup: ["Floral tea cup", "Tea for one (again)"],
	mug: [
		"World’s Best Uncle (disputed)",
		"Formerly white mug",
		"Florida souvenir mug",
		"Promotional coffee cup"
	],
	plate: [
		"Single dinner plate",
		"Chipped side plate",
		"Wedding china (one survivor)"
	],
	vase: [
		"A vase with opinions",
		"Possibly antique vase",
		"Unfashionable ceramic vase"
	],
	pot: ["Sunday enamel pot", "One-pot dinner solution"],
	kettle: ["Vintage electric kettle", "The good kettle"],
	book: [
		"Practical Disappointments, Vol. II",
		"Yesterday’s Computer Manual",
		"The Complete Incomplete Cookbook",
		"A Very Long Weekend"
	],
	dvd: [
		"Pilates For Everyone Else",
		"Unlabeled wedding video",
		"Disc 2 of 3",
		"Romantic Comedy, Probably"
	],
	radio: ["Kitchen radio", "Clock radio, no clock"],
	lamp: ["Beige is a lifestyle", "One bedside lamp"],
	"desk-lamp": ["Adjustable desk lamp", "Homework light"],
	boombox: ["Cassette player", "Portable neighborhood disturbance"],
	hammer: ["Well-used hammer"],
	hanger: ["Spare wire hanger"],
	shirt: [
		"Striped weekend shirt",
		"A very confident blouse",
		"Company picnic tee",
		"Forgotten formal shirt"
	],
	trousers: [
		"Corduroy trousers",
		"Office pants",
		"Sunday slacks"
	],
	shoe: ["Left and right shoe", "Very optimistic sneakers"]
};
const prices = {
	transceiver: 899,
	"watering-can": 499,
	"horse-statue": 599,
	lantern: 699,
	teapot: 699,
	"tea-mug": 199,
	"sugar-bowl": 299,
	"square-plate": 199,
	saucer: 99,
	bust: 699,
	"cat-statue": 499,
	"oil-lamp": 899,
	"book-alt": 199,
	teacup: 175,
	mug: 199,
	plate: 149,
	vase: 499,
	pot: 699,
	kettle: 1199,
	book: 199,
	dvd: 99,
	radio: 599,
	lamp: 799,
	"desk-lamp": 899,
	boombox: 1299,
	hammer: 550,
	hanger: 99,
	shirt: 399,
	trousers: 499,
	shoe: 699
};
function rng(seed) {
	let n = seed >>> 0;
	return () => {
		n += 1831565813;
		let t = Math.imul(n ^ n >>> 15, 1 | n);
		t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
const assortments = {
	china: [
		"plate",
		"plate",
		"saucer",
		"square-plate",
		"tea-mug",
		"teapot",
		"sugar-bowl"
	],
	cups: [
		"mug",
		"mug",
		"teacup",
		"tea-mug",
		"saucer",
		"teapot"
	],
	decor: [
		"vase",
		"vase",
		"bust",
		"cat-statue",
		"horse-statue",
		"oil-lamp"
	],
	cookware: [
		"pot",
		"pot",
		"kettle",
		"plate",
		"square-plate"
	],
	tools: [
		"hammer",
		"watering-can",
		"lantern",
		"hanger"
	],
	appliances: [
		"boombox",
		"transceiver",
		"kettle",
		"lantern"
	],
	books: ["book", "book-alt"]
};
const widths = {
	transceiver: .38,
	"watering-can": .4,
	"horse-statue": .3,
	lantern: .21,
	plate: .26,
	"square-plate": .26,
	saucer: .18,
	mug: .17,
	"tea-mug": .16,
	teacup: .14,
	teapot: .33,
	"sugar-bowl": .2,
	vase: .23,
	bust: .22,
	"cat-statue": .22,
	"oil-lamp": .16,
	pot: .32,
	kettle: .24,
	hammer: .19,
	hanger: .32,
	boombox: .46,
	radio: .46,
	"desk-lamp": .36,
	book: .042,
	"book-alt": .044
};
function makeStock() {
	const out = specials.map((i) => ({
		...i,
		variant: 2,
		rotation: i.faceRotation ?? 0,
		approach: {
			x: i.x + Math.sin(i.faceRotation ?? 0) * 1.05,
			z: i.z + Math.cos(i.faceRotation ?? 0) * 1.05
		}
	}));
	let n = 0;
	const counts = /* @__PURE__ */ new Map(), limits = {
		boombox: 4,
		transceiver: 3,
		kettle: 5,
		lantern: 5,
		bust: 3,
		"cat-statue": 4,
		"horse-statue": 3,
		"oil-lamp": 5,
		teapot: 4,
		"sugar-bowl": 5,
		"watering-can": 4,
		hammer: 6,
		vase: 10
	};
	function add(kind, fixture, u, depth, y, scale, variant, rotation = 0, extra = {}) {
		const key = fixture.id + ":" + kind, count = counts.get(key) ?? 0;
		if (count >= (limits[kind] === void 0 ? 999 : Math.ceil(limits[kind] * ((extra.tier ?? 6) + 1) / 7))) return;
		const r = fixture.rotation ?? 0, c = Math.cos(r), q = Math.sin(r), x = fixture.x + c * u + q * depth, z = fixture.z - q * u + c * depth;
		if (specials.some((i) => Math.abs(i.x - x) < .32 && Math.abs(i.z - z) < .36 && Math.abs(i.y - y) < .34)) return;
		counts.set(key, count + 1);
		out.push({
			id: `find-${n++}`,
			kind,
			name: names[kind][Math.floor(extra.namePick ?? 0) % names[kind].length],
			price: prices[kind] + variant * 25,
			section: fixture.section === "media" ? "Books & media" : fixture.section === "home" ? "Housewares" : fixture.section === "hardware" ? "Hardware" : "Electronics",
			fixtureId: fixture.id,
			x,
			z,
			y,
			scale,
			variant,
			rotation: r + rotation,
			faceRotation: r,
			approach: {
				x: x + q * .95,
				z: z + c * .95
			},
			detail: "An individual donation. Check the condition. Read the tag.",
			...extra
		});
	}
	for (const [si, f] of shelves.entries()) {
		const random = rng(8741 + si * 191), pick = (a) => a[Math.floor(random() * a.length)], levels = f.section === "media" ? [
			.12,
			.43,
			.73,
			1.05,
			1.39,
			1.81
		] : [
			.15,
			.41,
			.71,
			1.02,
			1.32,
			1.63,
			1.93
		];
		for (const [tier, y] of levels.entries()) {
			const pool = assortments[f.theme], finish = random() < .22 ? .15 + random() * .8 : 1.12;
			let u = -1.12 + random() * .22;
			while (u < finish) {
				if (random() < .22) {
					u += .11 + random() * .22;
					continue;
				}
				if (f.section === "media" && random() < .14 && u < finish - .28) {
					const kind = pick(pool), variant = Math.floor(random() * 6), layers = 2 + Math.floor(random() * 3);
					for (let l = 0; l < layers; l++) add(kind, f, u + .12, .1, y + l * .032, .83, variant, (random() - .5) * .08, {
						pitch: Math.PI / 2,
						namePick: Math.floor(random() * 20),
						stack: l
					});
					u += .29 + random() * .12;
					continue;
				}
				let kind = pick(pool), scale = kind === "book" || kind === "book-alt" ? .77 + random() * .14 : kind === "vase" || kind === "bust" ? .45 + random() * .15 : kind === "desk-lamp" ? .28 + random() * .1 : .61 + random() * .27;
				const variant = Math.floor(random() * 6), cluster = 1 + Math.floor(random() * (f.section === "media" ? 8 : 4));
				for (let k = 0; k < cluster; k++) {
					if (random() < .18) {
						kind = pick(pool);
						scale = kind === "book" || kind === "book-alt" ? .77 + random() * .14 : kind === "vase" || kind === "bust" ? .45 + random() * .15 : kind === "desk-lamp" ? .28 + random() * .1 : .61 + random() * .27;
					}
					const width = (widths[kind] ?? .2) * scale;
					if (u + width > finish) break;
					u += width / 2;
					const depth = .09 + random() * .1, stack = [
						"plate",
						"saucer",
						"square-plate"
					].includes(kind) ? 1 + Math.floor(random() * 5) : 1;
					for (let layer = 0; layer < stack; layer++) add(kind, f, u + (layer ? random() * .004 : 0), depth, y + layer * .009, scale, variant, f.section === "media" ? Math.PI / 2 : (random() - .5) * .65, {
						tier,
						namePick: Math.floor(random() * 20),
						roll: f.section === "media" ? (random() - .5) * .16 : 0,
						stack: layer
					});
					u += width / 2 + .006 + random() * (f.section === "media" ? .016 : .055);
				}
				u += .08 + random() * .17;
			}
		}
	}
	for (const [ri, r] of racks.entries()) {
		const random = rng(900 + ri * 89), count = 19 + Math.floor(random() * 11);
		let cursor = -1.1;
		for (let i = 0; i < count; i++) {
			const angle = i / count * Math.PI * 2, kind = r.section.includes("trousers") ? "trousers" : r.section.includes("Women") ? "blouse" : "shirt";
			cursor += .045 + random() * .045;
			if (i === Math.floor(count * .6)) cursor += .15;
			const x = r.x + (r.round ? Math.sin(angle) * .95 : Math.min(1.15, cursor)), z = r.z + (r.round ? Math.cos(angle) * .95 : (random() - .5) * .07);
			if (specials.some((s) => Math.abs(s.x - x) < .27 && Math.abs(s.z - z) < .3)) continue;
			out.push({
				id: `garment-${n++}`,
				kind,
				name: names[kind === "blouse" ? "shirt" : kind][i % names[kind === "blouse" ? "shirt" : kind].length],
				price: prices[kind === "blouse" ? "shirt" : kind] + i % 4 * 50,
				section: r.section,
				x,
				z,
				y: r.section === "Children" ? .96 : kind === "trousers" ? .67 : .73,
				scale: (r.section === "Children" ? .72 : 1) * (.94 + random() * .1),
				variant: Math.floor(random() * 6),
				rotation: (r.round ? angle : Math.PI / 2) + (random() - .5) * .18,
				approach: {
					x,
					z: z + 1
				},
				detail: "Check the seams. Read the tag. Imagine the possibilities."
			});
		}
	}
	const shoeRandom = rng(781);
	for (let i = 0; i < 24; i++) out.push({
		id: `shoe-${i}`,
		kind: "shoe",
		name: names.shoe[i % 2],
		price: 699 + i % 3 * 100,
		section: "All-gender shoes",
		x: -14.1 + i % 2 * .36,
		y: .25 + Math.floor(i / 8) * .44,
		z: -6.1 + i % 8 * .3 + (shoeRandom() - .5) * .08,
		scale: .93 + shoeRandom() * .12,
		variant: i % 6,
		rotation: Math.PI / 2 + (shoeRandom() - .5) * .3,
		approach: {
			x: -12.8,
			z: -6.1 + i % 8 * .3
		},
		detail: "Two shoes. One questionable journey."
	});
	for (const [j, [x, z]] of [
		[-12.2, 8.8],
		[12.2, 8.8],
		[8.3, 5.5],
		[12.2, 5.5]
	].entries()) {
		const f = {
			id: "table-" + j,
			x,
			z,
			rotation: 0,
			section: "home"
		}, random = rng(442 + j), pool = assortments[j % 2 ? "china" : "decor"];
		for (let i = 0; i < 8; i++) {
			const kind = pool[Math.floor(random() * pool.length)];
			add(kind, f, -.5 + i % 3 * .36 + (random() - .5) * .07, -.22 + Math.floor(i / 3) * .21, .79, kind === "bust" ? .65 : .75, Math.floor(random() * 6), (random() - .5) * .55, { namePick: i });
		}
	}
	return out;
}
const catalog = makeStock();

// projects/mairas-dream/rules.js
const objectives = [
	{
		title: "The keys are in the car. Again.",
		text: "A hanger, a mug, and a book. Roadside assistance appreciates a prepared audience.",
		needs: [
			"hanger",
			"mug",
			"book"
		]
	},
	{
		title: "An extremely small shed.",
		text: "A hammer, a how-to book, and a plate. Construction requires a lunch break.",
		needs: [
			"hammer",
			"book",
			"plate"
		]
	},
	{
		title: "Dinner with someone’s parents.",
		text: "A presentable shirt, a lamp, and a mug. Pretend this was planned.",
		needs: [
			"shirt",
			"lamp",
			"mug"
		]
	}
];
function levelConfig(level = 1) {
	level = Math.max(1, Math.floor(level));
	return {
		level,
		budget: level === 1 ? 3e3 : level === 2 ? 2200 : Math.max(350, 1e3 - (level - 3) * 150),
		cats: Math.min(8, level),
		catSpeed: .85 + (level - 1) * .33,
		fireEvery: Math.max(.95, 4.4 - level * .43),
		carGrace: Math.max(7, 23 - level * 2),
		carDamage: .6 + level * .38,
		managerSpeed: 1.9 + Math.min(level, 8) * .12,
		managerSight: 9 + Math.min(level, 5),
		maxFire: 20 + level * 8
	};
}
function createRun(seed = Math.floor(Math.random() * 1e6), level = 1) {
	const config = levelConfig(level), lookup = new Map(catalog.map((i) => [i.id, i]));
	const mission = level >= 3 ? objectives[(level - 3) % 2 === 0 ? 2 : 1] : objectives[Math.abs(seed) % objectives.length];
	const state = {
		seed,
		level: config.level,
		config,
		objective: mission,
		phase: "shopping",
		money: config.budget,
		bag: [],
		paid: [],
		concealed: [],
		swapped: [],
		suspicion: 0,
		health: 100,
		car: 100,
		elapsed: 0,
		charge: 100,
		extinguisher: false,
		reason: "",
		witnessed: false
	};
	const item = (id) => lookup.get(id);
	const price = (id) => state.swapped.includes(id) ? 99 : item(id)?.price ?? 0;
	const total = () => state.bag.filter((id) => !state.concealed.includes(id)).reduce((s, id) => s + price(id), 0);
	const has = (id) => state.bag.includes(id) || state.paid.includes(id);
	const required = () => state.objective.needs.every(has);
	const ownedRequired = () => state.objective.needs.every((id) => state.paid.includes(id) || state.concealed.includes(id));
	function take(id) {
		if (state.phase !== "shopping" || !item(id) || has(id) || state.bag.length >= 18) return false;
		state.bag.push(id);
		return true;
	}
	function putBack(id) {
		const i = state.bag.indexOf(id);
		if (state.phase !== "shopping" || i < 0) return false;
		state.bag.splice(i, 1);
		state.concealed = state.concealed.filter((x) => x !== id);
		state.swapped = state.swapped.filter((x) => x !== id);
		return true;
	}
	function swap(id, { seen = false } = {}) {
		if (state.phase !== "shopping" || !state.bag.includes(id) || state.swapped.includes(id)) return false;
		state.swapped.push(id);
		if (seen) {
			state.witnessed = true;
			state.suspicion = Math.min(100, state.suspicion + 75);
		}
		return true;
	}
	function conceal(id, { seen = false } = {}) {
		if (state.phase !== "shopping" || !state.bag.includes(id)) return false;
		if (state.concealed.includes(id)) {
			state.concealed = state.concealed.filter((x) => x !== id);
			return true;
		}
		state.concealed.push(id);
		if (seen) {
			state.witnessed = true;
			state.suspicion = Math.min(100, state.suspicion + 85);
		}
		return true;
	}
	function checkout() {
		if (state.phase !== "shopping") return {
			ok: false,
			message: "The register is closed."
		};
		const sale = state.bag.filter((id) => !state.concealed.includes(id));
		if (!sale.length) return {
			ok: false,
			message: "“Anything on the counter?”"
		};
		if (total() > state.money) return {
			ok: false,
			message: "“That’s more than you have. Something has to go back.”"
		};
		if (state.witnessed && sale.some((id) => state.swapped.includes(id))) {
			state.suspicion = 100;
			return {
				ok: false,
				message: "“Hang on. The manager mentioned these tags.”"
			};
		}
		const cost = total();
		state.money -= cost;
		state.paid.push(...sale);
		state.bag = state.bag.filter((id) => state.concealed.includes(id));
		return {
			ok: true,
			cost,
			message: "“Receipt’s in the bag. Good luck out there.”"
		};
	}
	function fail(reason) {
		if (["won", "lost"].includes(state.phase)) return;
		state.phase = "lost";
		state.reason = reason;
	}
	function leave({ seen = false } = {}) {
		if (state.phase !== "shopping" || !ownedRequired()) return false;
		if (state.bag.some((id) => !state.concealed.includes(id))) return false;
		if (state.concealed.length && seen) {
			state.witnessed = true;
			state.suspicion = 100;
		}
		state.phase = "escape";
		state.elapsed = 0;
		return true;
	}
	function escape() {
		if (state.phase !== "escape" || !ownedRequired()) return false;
		state.phase = "won";
		return true;
	}
	function update(dt, { tampering = false, seen = false, nearFire = false, carFire = false, spraying = false } = {}) {
		if (!Number.isFinite(dt) || dt <= 0) return;
		dt = Math.min(dt, .1);
		if (["shopping", "escape"].includes(state.phase)) {
			if (tampering && seen) {
				state.suspicion = Math.min(100, state.suspicion + 42 * dt);
				if (state.suspicion > 55) state.witnessed = true;
			} else if (!state.witnessed) state.suspicion = Math.max(0, state.suspicion - 7 * dt);
		}
		if (state.phase === "escape") {
			state.elapsed += dt;
			if (carFire && state.elapsed > 2) state.car = Math.max(0, state.car - config.carDamage * dt);
			if (nearFire) state.health = Math.max(0, state.health - 19 * dt);
			if (spraying && state.extinguisher) state.charge = Math.max(0, state.charge - 12 * dt);
			if (state.health <= 0) fail("The cats have made the parking lot uninhabitable.");
			else if (state.car <= 0) fail("Your car is now a very expensive candle.");
		}
	}
	return {
		state,
		item,
		price,
		total,
		has,
		required,
		ownedRequired,
		take,
		putBack,
		swap,
		conceal,
		checkout,
		leave,
		escape,
		fail,
		update
	};
}
function attach(object, opts = {}) {
	return {
		...createRun(opts.seed, opts.level),
		dispose() {}
	};
}

export { attach, catalog, createRun, levelConfig, objectives };