import { z } from "zod";

// Use the regular parser under a Content Security Policy without unsafe-eval.
z.config({ jitless: true });

export { z };
