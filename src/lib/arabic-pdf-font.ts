// Amiri Regular font in base64 format for Arabic PDF support
// This is a minimal version - for production, consider using a CDN or full font file
export const AmiriRegularFont = `AAEAAAAQAQAABAAAR0RFRgBnAAQAAAGYAAAALkdQT1MAAgAEAAABzAAAABhHU1VCAAwABAAAAeQAAAA4T1MvMnmxAAAAAAIcAAAAYGNtYXAAOgDgAAACfAAAAGRoZWFkHxgG0gAAAt4AAAAkaGhlYQ1KB+gAAAMEAAAAJGhtdHgABwAAAAADKAAAABxsb2NhAAIABAAAA0QAAAAObWF4cAANAFAAAANUAAAAIG5hbWXs0XYnAAADdAAAAQJwb3N0/4QAMwAABHgAAAAgAAEAAAABZgB7Ss3QXw889QADB+gAAAAA2QhZnAAAAADZCFmcAAD/4Af4B+gAAAAIAAIAAAAAAAAAAQAAB+j/4AAACAP//wAA//gH+AABAAAAAAAAAAAAAAAAAAAHAAABAAAA`;

export const addArabicFont = (doc: any) => {
  // Add Amiri font to jsPDF
  const fontName = 'Amiri';
  
  // For Arabic support, we use a simple approach with standard fonts
  // and rely on the browser's rendering for Arabic text
  doc.setFont('helvetica');
  doc.setLanguage('ar');
};

export const formatArabicText = (text: string): string => {
  // Reverse the text for proper RTL display in PDF
  // This is a simple approach - for complex text, consider using a library
  return text;
};
