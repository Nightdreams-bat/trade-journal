/**
 * Must be the FIRST import in main.ts. ESM evaluates imports in declaration
 * order, each fully before the next sibling starts — so importing this
 * first guarantees SUPABASE_URL/SUPABASE_ANON_KEY are in `process.env`
 * before `./ipc` (which transitively imports supabaseClient.ts, reading
 * those vars at module-load time) gets evaluated. Doing `dotenv.config()`
 * in main.ts's own body would run too late: static imports resolve before
 * an importing module's own top-level code does, regardless of where that
 * code sits textually relative to the import statements.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })
