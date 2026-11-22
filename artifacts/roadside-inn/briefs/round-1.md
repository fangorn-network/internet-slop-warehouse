# Round 1 for Victor (2026-11-22): build order

Specs: projects/roadside-inn/specs/{room-king-bed,room-king-bath,lobby-coffee}.md. Kinds are in kinds.js (data only).
Each brief names its hooks; origins as stated in each. Deliver to projects/roadside-inn/assets/, one assets-N.parts.json entry.

1. hotel-room-wastebasket   (bedroom + bath, small-bin)
2. hotel-tp-holder          (bath, tp-holder: take_roll, take_roll_spare)
3. hotel-towel-bar-towels   (bath, towel-bar: take_towel*)
4. hotel-swing-arm-sconce   (bedroom, wall-lamp: arm_pivot, light_point, switch)
5. hotel-blackout-drapes    (bedroom, drapes; ingest ambientCG Fabric031, CC0)
6. hotel-coffee-station     (rebuild bare + waste hole: bin_opening)
7. hotel-coffee-tower       (dispenser: fill_spout, fill_point, lever; COFFEE/DECAF band)
8. hotel-cup-rack           (cup-stack: take_cup*)
9. hotel-lid-bin            (lid-stack: take_lid*)
10. hotel-condiment-riser   (caddy: take_sleeve, take_sugar_packet, take_creamer, take_napkin)
11. hotel-hot-water-box     (dispenser + cord_exit)
12. hotel-stirrer-tumbler   (caddy: take_stirrer, take_creamer_cup)
13. hotel-luggage-cart-brass (luggage-cart: grab, deck; real brass)
14. hotel-roller-bag        (roller-bag: handle)
