# hotel-cup-rack: angled wood cup rack with four stacks of paper hot cups

for: lobby-coffee   kind: cup-stack   replaces: the cup stacks baked into hotel-coffee-station   priority: 1

## Real thing
size (cm, W×D×H): rack 30×20×55, four slots angled 20° back; each stack 8.9 dia × 30 (about 25 cups, nested pitch 1.1 cm)  ·  cup 0.01 kg
construction: blond-wood (oak/birch) side panels and four round-cut shelves holding the stacks mouth up, angled, the top cup's rim proud of the slot so it can be pulled; the top 2 cups of one stack are crushed in
slightly, one stack is shorter than the rest
materials: wood light oak, satin lacquer; cups white paper with a printed navy band (generic, "Heartland Inn Express"
wordmark allowed, invented), inner wall a hair darker
wear: thumb grime on the slot fronts; cup rims dented
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2022_-_Sarah_Stierch.jpg (wood rack at the counter's left end) · https://commons.wikimedia.org/wiki/File:Breakfast_room,_Hampton_Inn,_Penn_Yan,_New_York_-_20230117.jpg (cup stacks at a serving counter)

## Hooks
- take_cup, take_cup001, take_cup002, take_cup003   the TOP cup of each stack (a single cup mesh, origin at its base centre)
- stack_0 … stack_3                                 the rest of each stack as one mesh (the kind shortens it per cup taken)

## Budget
tris ≤ 6k · materials ≤ 3 · textures ≤ 512 · phone LOD: no

## Placement (for Natasha)
put('hotel-cup-rack', 2.0, 0.94, -8.72, 0) · counter top, left end, slots facing +Z · collider: none
