import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface Service {
  id: string;
  name: string;
  base_price?: number;
}

interface ItemNameSelectProps {
  services: Service[];
  value: string;
  onValueChange: (value: string, price?: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ItemNameSelect({
  services,
  value,
  onValueChange,
  placeholder = "اختر اسم البند أو اكتب اسماً جديداً...",
  disabled = false
}: ItemNameSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [customInput, setCustomInput] = useState(false);

  // البحث في الخدمات
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // إذا كانت القيمة لا تطابق أي خدمة، اجعلها إدخال مخصص
  useEffect(() => {
    const serviceExists = services.some(service => service.name === value);
    setCustomInput(!serviceExists && value !== "");
  }, [value, services]);

  return (
    <div className="w-full">
      {customInput ? (
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => {
              setCustomInput(false);
              onValueChange("");
            }}
            disabled={disabled}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              {value ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{value}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                  <span>{placeholder}</span>
                </div>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 z-50 bg-background" align="start">
            <Command>
              <CommandInput 
                placeholder="البحث في الخدمات أو اكتب اسماً جديداً..." 
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2 space-y-2">
                    <p className="text-sm text-muted-foreground">لم يتم العثور على خدمات مطابقة</p>
                    {searchValue && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onValueChange(searchValue);
                          setCustomInput(true);
                          setOpen(false);
                          setSearchValue("");
                        }}
                      >
                        استخدم "{searchValue}" كاسم بند مخصص
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
                <CommandGroup heading="الخدمات المتاحة">
                  {filteredServices.map((service) => (
                    <CommandItem
                      key={service.id}
                      value={service.name}
                      onSelect={() => {
                        onValueChange(service.name, service.base_price);
                        setOpen(false);
                        setSearchValue("");
                      }}
                      className="flex items-center gap-3 p-3"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === service.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full flex-shrink-0">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="font-medium truncate">{service.name}</div>
                          {service.base_price && (
                            <div className="text-sm text-muted-foreground">
                              السعر الأساسي: {service.base_price.toLocaleString()} ر.س
                            </div>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {searchValue && !filteredServices.some(s => s.name.toLowerCase() === searchValue.toLowerCase()) && (
                  <CommandGroup heading="إضافة بند مخصص">
                    <CommandItem
                      value={searchValue}
                      onSelect={() => {
                        onValueChange(searchValue);
                        setCustomInput(true);
                        setOpen(false);
                        setSearchValue("");
                      }}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 bg-accent rounded-full">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">إضافة "{searchValue}"</div>
                          <div className="text-sm text-muted-foreground">كبند مخصص</div>
                        </div>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}