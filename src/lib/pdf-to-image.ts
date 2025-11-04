import * as pdfjsLib from 'pdfjs-dist';

// تهيئة PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * تحويل ملف PDF إلى صورة
 * @param pdfUrl رابط ملف PDF
 * @param pageNumber رقم الصفحة (افتراضي: 1)
 * @param scale مقياس الجودة (افتراضي: 2)
 * @returns Promise<string> صورة بصيغة data URL
 */
export const convertPdfToImage = async (
  pdfUrl: string,
  pageNumber: number = 1,
  scale: number = 2
): Promise<string> => {
  try {
    // تحميل ملف PDF
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;

    // الحصول على الصفحة المطلوبة
    const page = await pdf.getPage(pageNumber);

    // إعداد canvas
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('فشل في إنشاء سياق Canvas');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // رسم الصفحة على canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext as any).promise;

    // تحويل canvas إلى data URL
    return canvas.toDataURL('image/png', 0.95);
  } catch (error) {
    console.error('خطأ في تحويل PDF إلى صورة:', error);
    throw error;
  }
};

/**
 * الحصول على عدد صفحات ملف PDF
 * @param pdfUrl رابط ملف PDF
 * @returns Promise<number> عدد الصفحات
 */
export const getPdfPageCount = async (pdfUrl: string): Promise<number> => {
  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    console.error('خطأ في الحصول على عدد صفحات PDF:', error);
    throw error;
  }
};
