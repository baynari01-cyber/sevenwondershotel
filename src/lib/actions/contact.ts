"use server";

import { z } from "zod";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";

export type ContactFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; errors: Record<string, string> };

const LIMITS = {
  name: { min: 2, max: 80 },
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 2000 },
} as const;

const emailCheck = z.email();
const trimmed = z.string().trim();

const contactSchema = z.object({
  name: trimmed.min(1, "validation.required").min(LIMITS.name.min, "validation.minLength").max(LIMITS.name.max, "validation.maxLength"),
  email: trimmed
    .min(1, "validation.required")
    .max(254, "validation.maxLength")
    .refine((v) => emailCheck.safeParse(v).success, "validation.email"),
  phone: trimmed.max(40, "validation.maxLength").refine((v) => v === "" || /^\+?[0-9()\s.-]{6,}$/.test(v), "validation.phone"),
  subject: trimmed.min(1, "validation.required").min(LIMITS.subject.min, "validation.minLength").max(LIMITS.subject.max, "validation.maxLength"),
  message: trimmed.min(1, "validation.required").min(LIMITS.message.min, "validation.minLength").max(LIMITS.message.max, "validation.maxLength"),
});

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitContactMessage(_prevState: ContactFormState, formData: FormData): Promise<ContactFormState> {
  // Honeypot: real users never see or fill this field. A non-empty value is spam,
  // so we answer with a quiet success and store nothing.
  if (field(formData, "website").trim() !== "") return { status: "success" };

  const parsed = contactSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    subject: field(formData, "subject"),
    message: field(formData, "message"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in errors)) errors[key] = issue.message;
    }
    return { status: "error", errors };
  }

  const locale = await getLocale();
  const { name, email, phone, subject, message } = parsed.data;

  try {
    await prisma.contactMessage.create({
      data: { name, email, phone: phone === "" ? null : phone, subject, message, locale },
    });
  } catch {
    return { status: "error", errors: { form: "common.error" } };
  }

  return { status: "success" };
}
