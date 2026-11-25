import assert from "node:assert/strict";
import { analyzeDump } from "../lib/restore-drill.mjs";

const good = `-- PostgreSQL database dump\nCREATE TABLE public.a (id int);\nCOPY public.a (id) FROM stdin;\n1\n2\n\\.\n-- PostgreSQL database dump complete\n`;
assert.equal(analyzeDump(good, ["a"]).ok, true);
assert.equal(analyzeDump(good, ["a"]).rowsByTable.a, 2);
assert.match(analyzeDump(good, ["b"]).problems[0], /not created/);
assert.ok(analyzeDump(good.replace("-- PostgreSQL database dump complete\n", ""), ["a"]).problems.some((p) => /truncated/.test(p)));
assert.ok(analyzeDump("CREATE TABLE a (id int);", ["a"]).problems.some((p) => /header/.test(p)));
assert.ok(analyzeDump(good.replace("COPY public.a (id) FROM stdin;\n1\n2\n\\.\n", ""), ["a"]).problems.some((p) => /no data/.test(p)));
console.log("restore-drill tests passed");
