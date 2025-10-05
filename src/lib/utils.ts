import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * تنظيف رقم الهاتف من الأحرف الخاصة والرموز غير المرئية
 * يزيل: Left-to-Right Marks, Right-to-Left Marks, وغيرها من رموز Unicode الخاصة
 */
export function cleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  return phone
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '') // إزالة رموز التوجيه
    .replace(/[^\d+\s-]/g, '') // السماح فقط بالأرقام و + والمسافات والشرطات
    .trim();
}
