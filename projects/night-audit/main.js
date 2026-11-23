// SPDX-License-Identifier: CC0-1.0
// Night Audit: locked out at 3 AM, find your way back down to the front desk by the lobby's music (audit.js). A scene on
// the Heartland Inn's stage, playable by itself or after any intro: ?scenes=checkin,audit. ?seed=N replays a night.
import { boot } from '../heartland/boot.js';
import { audit, prebuild } from './audit.js';
import { checkin } from '../catherine/intro.js';

await boot({
  scenes: { checkin, audit }, fallback: 'audit', prebuilds: { floors: prebuild }, hook: '__audit',
  onEnd(ctx, { $, seed }) {
    const st = ctx.audit?.stats;
    if (st) $('tally').textContent = `${st.flights} flight${st.flights === 1 ? '' : 's'} down, in a building with two floors. ${st.off} TV${st.off === 1 ? '' : 's'} switched off. ${st.caught ? `It found you ${st.caught === 1 ? 'once' : st.caught + ' times'}. ` : 'It never found you. '}${st.minutes} minute${st.minutes === 1 ? '' : 's'}. Night ${st.seed}.`;
    $('again').href = `?seed=${seed}`; $('end').hidden = false;
  },
});
