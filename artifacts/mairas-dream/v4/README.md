# Little Treasures verification

- Seven transaction/campaign tests plus two parking/local-fire tests pass.
- `check-v4.mjs`: collapsed list is a 44px-tall button; sheet selection closes it, two-finger thumbstick/look movement and release work, portrait/landscape controls stay in bounds, map/inspection hide touch controls, new window stock can be picked up, desktop retains its list. 1,643 items; no page/shader errors. `browser-qa.json` and phone/store screenshots.
- `check-v4-release.mjs`: opaque-origin sandbox on phone viewport with all remote published assets. Successful pickup, inspection, checkout, cat animation and staged ignition; zero failed requests or errors. `release-qa.json`.
- Eight additional Poly Haven model types reuse existing verified warehouse publications, recorded in `projects/mairas-dream/decor-existing.parts.receipts.json`. New display geometry/stock layout has its own publication receipts.
- Phone UI checks use Chrome mobile emulation and real CDP touch events, rather than physical iPhone/Android hardware. Native hardware frame rates are not measured.

Public deployment verified: all 54 expected latest game/asset records match the live index. The actual public phone player reports Little Treasures / 1,643 items; compact list selection, touch joystick movement and map passed with no page errors. `public-index-qa.json`, `live-player-qa.json`, `live-player.png`, `live-map.png`.
