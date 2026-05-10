import { z } from "zod";
import { aiProviderSchema } from "@/lib/validators/ai";

const allowedTextMimeTypes = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
  "application/xml",
  "text/xml",
  "application/rtf",
  "text/rtf",
] as const;

const allowedImageMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const caseTypeSchema = z.enum(["POSITIVE", "NEGATIVE", "EDGE", "BOUNDARY"]);
export const generationModeSchema = z.enum(["SMOKE", "REGRESSION", "EDGE_HEAVY"]);
export const testCaseAttachmentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    mimeType: z.string().min(1).max(120),
    kind: z.enum(["TEXT", "IMAGE"]),
    textContent: z.string().max(20000).optional(),
    imageDataUrl: z.string().max(8_000_000).optional(),
  })
  .superRefine((attachment, context) => {
    if (attachment.kind === "TEXT" && !attachment.textContent) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Text attachments must include extracted text content.",
      });
    }

    if (attachment.kind === "IMAGE" && !attachment.imageDataUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image attachments must include image data.",
      });
    }

    if (
      attachment.kind === "TEXT" &&
      !allowedTextMimeTypes.includes(attachment.mimeType as (typeof allowedTextMimeTypes)[number])
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Text attachment MIME type is not allowed.",
      });
    }

    if (
      attachment.kind === "IMAGE" &&
      !allowedImageMimeTypes.includes(attachment.mimeType as (typeof allowedImageMimeTypes)[number])
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image attachment MIME type is not allowed.",
      });
    }

    if (
      attachment.kind === "IMAGE" &&
      attachment.imageDataUrl &&
      !attachment.imageDataUrl.startsWith(`data:${attachment.mimeType};base64,`)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image attachment data does not match its MIME type.",
      });
    }
  });

export const generatedTestCaseSchema = z.object({
  title: z.string().min(3),
  preconditions: z.array(z.string().min(1)).default([]),
  steps: z.array(z.string().min(1)).min(1),
  expectedResult: z.string().min(3),
  priority: prioritySchema,
  caseType: caseTypeSchema,
  tags: z.array(z.string().min(1)).optional(),
});

export const generateTestCasesRequestSchema = z.object({
  projectId: z.string().uuid(),
  featureTitle: z.string().min(3),
  sourceRequirement: z.string().min(10),
  acceptanceCriteria: z.string().min(1).optional(),
  contextNotes: z.string().max(4000).optional(),
  generationMode: generationModeSchema,
  attachments: z.array(testCaseAttachmentSchema).max(6).optional(),
  provider: aiProviderSchema.optional(),
});

export const generateTestCasesResponseSchema = z.object({
  cases: z.array(generatedTestCaseSchema).min(1),
});

export const saveTestCaseBatchRequestSchema = generateTestCasesRequestSchema.extend({
  cases: z.array(generatedTestCaseSchema).min(1),
});

export type GenerateTestCasesRequestInput = z.input<typeof generateTestCasesRequestSchema>;
export type GenerateTestCasesResponseOutput = z.output<typeof generateTestCasesResponseSchema>;
export type SaveTestCaseBatchRequestInput = z.input<typeof saveTestCaseBatchRequestSchema>;
