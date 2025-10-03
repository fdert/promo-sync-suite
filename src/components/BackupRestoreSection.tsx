import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Database, FileSpreadsheet, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const BackupRestoreSection = () => {
  const { toast } = useToast();
  const [sqlFile, setSqlFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [sqlPreview, setSqlPreview] = useState<any>(null);
  const [excelPreview, setExcelPreview] = useState<any>(null);
  const [showSqlPreview, setShowSqlPreview] = useState(false);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSqlFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSqlFile(file);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('preview-sql-backup', {
        body: formData,
      });

      if (error) throw error;

      setSqlPreview(data.preview);
      setShowSqlPreview(true);
      
      toast({
        title: "✅ تم تحليل الملف",
        description: "يمكنك الآن مراجعة محتوى النسخة الاحتياطية",
      });
    } catch (error: any) {
      console.error('Error previewing SQL:', error);
      toast({
        variant: "destructive",
        title: "❌ خطأ في قراءة الملف",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('preview-excel-orders', {
        body: formData,
      });

      if (error) throw error;

      setExcelPreview(data.preview);
      setShowExcelPreview(true);
      
      toast({
        title: "✅ تم تحليل الملف",
        description: "يمكنك الآن مراجعة محتوى ملف Excel",
      });
    } catch (error: any) {
      console.error('Error previewing Excel:', error);
      toast({
        variant: "destructive",
        title: "❌ خطأ في قراءة الملف",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreSql = async () => {
    if (!sqlFile) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', sqlFile);

      const { data, error } = await supabase.functions.invoke('restore-sql-backup', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: data.success ? "✅ تم استعادة النسخة الاحتياطية" : "⚠️ تمت الاستعادة مع أخطاء",
        description: data.message,
      });

      setShowSqlPreview(false);
      setSqlFile(null);
      setSqlPreview(null);
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      toast({
        variant: "destructive",
        title: "❌ خطأ في الاستعادة",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportExcel = async () => {
    if (!excelFile) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);

      const { data, error } = await supabase.functions.invoke('import-excel-orders', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: data.success ? "✅ تم استيراد الطلبات" : "⚠️ تم الاستيراد مع أخطاء",
        description: data.message,
      });

      setShowExcelPreview(false);
      setExcelFile(null);
      setExcelPreview(null);
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      toast({
        variant: "destructive",
        title: "❌ خطأ في الاستيراد",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              استيراد نسخة احتياطية
            </CardTitle>
            <CardDescription>
              استعادة قاعدة البيانات من ملف SQL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".sql"
                onChange={handleSqlFileSelect}
                className="hidden"
                id="sql-file-input"
                disabled={isLoading}
              />
              <label htmlFor="sql-file-input" className="cursor-pointer">
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">اضغط لاختيار ملف SQL</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {sqlFile ? sqlFile.name : "ملف النسخة الاحتياطية (.sql)"}
                </p>
              </label>
            </div>

            {sqlFile && (
              <Button
                onClick={() => setShowSqlPreview(true)}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <Eye className="ml-2 h-4 w-4" />
                معاينة قبل الاستعادة
              </Button>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                تحذير: استعادة النسخة الاحتياطية قد تستبدل البيانات الحالية. يُنصح بعمل نسخة احتياطية أولاً.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-600" />
              استيراد طلبات من Excel
            </CardTitle>
            <CardDescription>
              استيراد الطلبات من ملف Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFileSelect}
                className="hidden"
                id="excel-file-input"
                disabled={isLoading}
              />
              <label htmlFor="excel-file-input" className="cursor-pointer">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">اضغط لاختيار ملف Excel</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {excelFile ? excelFile.name : "ملف الطلبات (.xlsx)"}
                </p>
              </label>
            </div>

            {excelFile && (
              <Button
                onClick={() => setShowExcelPreview(true)}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <Eye className="ml-2 h-4 w-4" />
                معاينة قبل الاستيراد
              </Button>
            )}

            <Alert className="bg-green-50 dark:bg-green-900/10 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-xs text-green-800 dark:text-green-200">
                سيتم إنشاء العملاء تلقائياً إذا لم يكونوا موجودين مسبقاً.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* SQL Preview Dialog */}
      <Dialog open={showSqlPreview} onOpenChange={setShowSqlPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة النسخة الاحتياطية</DialogTitle>
            <DialogDescription>
              راجع محتوى النسخة الاحتياطية قبل الاستعادة
            </DialogDescription>
          </DialogHeader>

          {sqlPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">اسم الملف</p>
                  <p className="font-medium">{sqlPreview.fileName}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">حجم الملف</p>
                  <p className="font-medium">{(sqlPreview.fileSize / 1024).toFixed(2)} KB</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">إجمالي الأسطر</p>
                  <p className="font-medium">{sqlPreview.totalLines}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">عمليات الإدراج</p>
                  <p className="font-medium">{sqlPreview.totalInserts}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">إحصائيات الجداول:</h4>
                <div className="bg-muted p-4 rounded-lg space-y-1">
                  {Object.entries(sqlPreview.tableStats).map(([table, count]: [string, any]) => (
                    <div key={table} className="flex justify-between text-sm">
                      <span>{table}</span>
                      <span className="font-medium">{count} سجل</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">معاينة المحتوى:</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {sqlPreview.firstLines}
                </pre>
              </div>

              <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  تحذير: هذه العملية لا يمكن التراجع عنها. تأكد من أن هذا هو الملف الصحيح.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSqlPreview(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleRestoreSql}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "جاري الاستعادة..." : "تأكيد الاستعادة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Preview Dialog */}
      <Dialog open={showExcelPreview} onOpenChange={setShowExcelPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة ملف الطلبات</DialogTitle>
            <DialogDescription>
              راجع محتوى الطلبات قبل الاستيراد
            </DialogDescription>
          </DialogHeader>

          {excelPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">اسم الملف</p>
                  <p className="font-medium">{excelPreview.fileName}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">عدد الطلبات</p>
                  <p className="font-medium">{excelPreview.totalRows}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">حجم الملف</p>
                  <p className="font-medium">{(excelPreview.fileSize / 1024).toFixed(2)} KB</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">الأعمدة المتاحة:</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {excelPreview.columns.map((col: string) => (
                      <span key={col} className="bg-background px-2 py-1 rounded text-xs">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">معاينة البيانات (أول 10 صفوف):</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        {excelPreview.columns.slice(0, 5).map((col: string) => (
                          <th key={col} className="p-2 text-right font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreview.sampleData.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          {excelPreview.columns.slice(0, 5).map((col: string) => (
                            <td key={col} className="p-2">
                              {String(row[col] || '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Alert className="bg-green-50 dark:bg-green-900/10 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  سيتم استيراد {excelPreview.totalRows} طلب. يمكنك المتابعة بأمان.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExcelPreview(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleImportExcel}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "جاري الاستيراد..." : "تأكيد الاستيراد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
