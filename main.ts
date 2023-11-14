/**
 * ## RSSAgent IRC logs Into Minutes in Markdown — Deno version
 * 
 * This is the simple, trivial entry point: run from the CLI
 *
 * @version: 1.0.0
 * @author: Ivan Herman, <ivan@w3.org> (https://www.w3.org/People/Ivan/)
 * @license: W3C Software License <https://www.w3.org/Consortium/Legal/2002/copyright-software-20021231>
 *
 * @packageDocumentation
 */

import { run } from './lib/index.ts'

// fake CLI by adding to "" entries; this is necessary, because the package uses 
// the npm package "command" for CLI parsing, which relies on the first two entries 
// being used by node.js...
await run(["","",...Deno.args]);
Deno.exit();
