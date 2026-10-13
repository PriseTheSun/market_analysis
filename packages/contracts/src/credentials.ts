import { z } from "zod";

export const passwordSchema = z.string().min(12).max(128);
