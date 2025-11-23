// Amiri Regular font in base64 format for Arabic PDF support
// ملاحظة: هذه نسخة مضغّرة من الخط. في حال احتجت لجودة أعلى يمكن استبدالها بخط كامل لاحقًا.
export const AmiriRegularFont = `AAEAAAAQAQAABAAAR0RFRgBnAAQAAAGYAAAALkdQT1MAAgAEAAABzAAAABhHU1VCAAwABAAAAeQAAAA4T1MvMnmxAAAAAAIcAAAAYGNtYXAAOgDgAAACfAAAAGRoZWFkHxgG0gAAAt4AAAAkaGhlYQ1KB+gAAAMEAAAAJGhtdHgABwAAAAADKAAAABxsb2NhAAIABAAAA0QAAAAObWF4cAANAFAAAANUAAAAIG5hbWXs0XYnAAADdAAAAQJwb3N0/4QAMwAABHgAAAAgAAEAAAABZgB7Ss3QXw889QADB+gAAAAA2QhZnAAAAADZCFmcAAD/4Af4B+gAAAAIAAIAAAAAAAAAAQAAB+j/4AAACAP//wAA//gH+AABAAAAAAAAAAAAAAAAAAAHAAABAAAA`;

/**
 * تفعيل خط عربي (Amiri) في مستند jsPDF
 * - يضيف الخط من base64 إلى VFS
 * - يسجّل الخط باسم "Amiri"
 * - يضبط اتجاه الكتابة من اليمين لليسار
 */
export const addArabicFont = (doc: any) => {
  try {
    // تسجيل الخط في مستند jsPDF من الـ base64
    doc.addFileToVFS('Amiri-Regular.ttf', AmiriRegularFont);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');

    // استخدام الخط العربي كخط افتراضي
    doc.setFont('Amiri', 'normal');

    // تفعيل اللغة العربية واتجاه الكتابة من اليمين لليسار إن توفّرت هذه الدوال
    if (typeof doc.setLanguage === 'function') {
      doc.setLanguage('ar');
    }
    if (typeof (doc as any).setR2L === 'function') {
      (doc as any).setR2L(true);
    }
  } catch (error) {
    console.error('Error adding Arabic font to jsPDF:', error);
    // في حال حدوث خطأ نستخدم الخط الافتراضي حتى لا يتوقف التصدير
    doc.setFont('helvetica', 'normal');
  }
};

/**
 * تهيئة النص العربي قبل إرساله إلى PDF (في الوقت الحالي نعيد النص كما هو)
 * يمكن لاحقًا إضافة إعادة تشكيل للأحرف أو تنظيف للنص إذا لزم الأمر.
 */
export const formatArabicText = (text: string): string => {
  return text ?? '';
};
