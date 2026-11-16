// Keep the original verification entry point useful after the second revision.
if(process.argv.includes('--release'))await import('./check-release.mjs');else await import('./check-v2.mjs');
