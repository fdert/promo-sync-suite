import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

interface CompanyStampSettingsProps {
  stampUrl: string;
  onStampUpdate: (url: string) => void;
}

const CompanyStampSettings: React.FC<CompanyStampSettingsProps> = ({ 
  stampUrl, 
  onStampUpdate 
}) => {
  const [localStampUrl, setLocalStampUrl] = useState(stampUrl);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onStampUpdate(localStampUrl);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          إعدادات الختم
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إعدادات ختم الوكالة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stamp_url">رابط ختم الوكالة</Label>
            <Input 
              id="stamp_url"
              type="url"
              value={localStampUrl}
              onChange={(e) => setLocalStampUrl(e.target.value)}
              placeholder="أدخل رابط صورة الختم"
            />
            <p className="text-sm text-muted-foreground">
              سيظهر الختم أسفل الفاتورة تحت المجموع الكلي
            </p>
          </div>
          {localStampUrl && (
            <div className="flex justify-center p-4 border rounded-lg bg-muted">
              <img 
                src={localStampUrl} 
                alt="معاينة الختم" 
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave}>
              حفظ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyStampSettings;