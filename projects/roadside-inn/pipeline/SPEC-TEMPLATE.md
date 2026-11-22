# <space id>: <one line: what this space is>

space: <space id>            zone box (x0 x1 y0 y1 z0 z1, metres, game coords; from check-lint.json zones or the lead): <...>
type: <e.g. upper-midscale US limited-service hotel, built ~2015-2022, king guest room bathroom>
refs: <3-8 photo URLs actually looked at; one per line below if long>

## Read of the place (≤ 120 words)
Light (sources, colour temperature, where it pools, where it's dark), sound, smell, how used it looks, what a guest
notices first. Plain facts, no adjectives without a reason.

## Inventory
One row per distinct thing. `kind`: an existing kinds.js kind if it fits, else a new lower-case name (Natasha registers
it). `model`: an existing assets/<id>.glb if one is right, else blank. Sizes in cm, W×D×H. `count` in this space.
`where`: against which wall / on what / height. `condition`: real wear (scuffs, stains, dust, fading) and how much.
`does`: what a guest can do with it (switch, open, fill, take, throw away, sit). `refs`: photo numbers from above.

| item | kind | model | count | size cm | material / finish | where | condition | does | refs |
|---|---|---|---|---|---|---|---|---|---|
| toilet paper holder, double | tp-holder | | 1 | 26×10×9 | brushed nickel, spring spindles | right of toilet, 66 cm up | finger marks on the hood | take a roll | 2,5 |

## Small things (lived-in dressing, ≤ 15 rows)
Same columns; the things that make it read as real: a folded paper strip, a cracked soap, a hair in the tub corner.

## Not here
Things a model would wrongly assume this space has (≤ 6 lines). E.g. "no bathtub in most king rooms built after 2015".
