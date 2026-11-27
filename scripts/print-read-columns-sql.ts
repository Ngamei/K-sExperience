// Prints SQL that selects exactly the columns the app reads, as the anon role (used by scripts/test-db.sh).
import { READ_COLUMNS } from "../src/lib/supabase/food";
console.log("set role anon;");
for (const [t, c] of Object.entries(READ_COLUMNS)) console.log(`select '${t}' as t, count(*) from (select ${c} from ${t}) x;`);
console.log("reset role;");
