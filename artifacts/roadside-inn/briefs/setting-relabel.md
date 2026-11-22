# setting-relabel: take the state out of baked labels

for: whole hotel   kind: -   replaces: label atlases + map mural   priority: 2

The hotel is in an unnamed roadside town ("anywhere roadside between OK and OH"). Runtime text is done (2026-11-22):
the interstate is I-62 (exists nowhere as a mainline), the town is Harlow Springs, the TV towns are Harlow Springs /
Harlan / Millbrook, the paper at the travel stop is The Cedar Gap Courier, the area code is (800). "The Ozarks" may
stay (it spans four states). The innkeeper statute notice stays Missouri (legal).

Re-bake with the same names:
- blender/labels.mjs: newspaper dateline 'SPRINGFIELD, MO' → 'HARLOW SPRINGS'; headline 'I-44 …' → 'I-62 …'; pen
  barrel 'I-44 Exit 77' → 'I-62 Exit 127'; key sleeve and any other 'I-44' / ', MO' / '(417)'
- blender/prints.mjs map mural: no 'LAKE OF THE OZARKS', 'Missouri River', 'St. Robert', 'Rolla' labels; invent
  (Harlow Lake, the river unnamed or "North Fork", I-62 bold); keep the style
Then rebuild the affected GLBs and add them to the next assets-N.parts.json.
