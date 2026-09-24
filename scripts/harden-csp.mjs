import {readFile,writeFile} from 'node:fs/promises';

const headerPath='dist/_headers';
const headers=await readFile(headerPath,'utf8');
if(!headers.includes('__INLINE_SCRIPT_HASHES__')) throw new Error('CSP hash placeholder is missing from dist/_headers.');
await writeFile(headerPath,headers.replace('__INLINE_SCRIPT_HASHES__',''));
console.log('CSP prepared for per-response nonces.');
