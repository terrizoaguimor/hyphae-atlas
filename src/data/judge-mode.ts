import {z} from "zod";

export const judgeStepSchema = z.enum(["conflict", "report", "proof", "evaluation"]);
export type JudgeStep = z.infer<typeof judgeStepSchema>;
export const judgeSteps = judgeStepSchema.options;
export function parseJudgeStep(search: string): JudgeStep | null {const value = new URLSearchParams(search).get("judge"); const parsed = judgeStepSchema.safeParse(value); return parsed.success ? parsed.data : null;}
