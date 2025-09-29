import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, User, Phone } from "lucide-react";
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

interface Customer {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
}

interface CustomerSearchSelectProps {
  customers: Customer[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function CustomerSearchSelect({
  customers,
  value,
  onValueChange,
  placeholder = "ابحث عن العميل بالاسم أو رقم الجوال..."
}: CustomerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // البحث المحسن في الاسم وأرقام الجوال
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchValue.toLowerCase();
    
    // البحث في الاسم
    const nameMatch = customer.name.toLowerCase().includes(searchLower);
    
    // البحث في رقم الجوال العادي
    const phoneMatch = customer.phone?.includes(searchValue) || false;
    
    // البحث في رقم الواتساب
    const whatsappMatch = customer.whatsapp?.includes(searchValue) || false;
    
    return nameMatch || phoneMatch || whatsappMatch;
  });

  const selectedCustomer = customers.find(customer => customer.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCustomer ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="font-medium truncate">{selectedCustomer.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {selectedCustomer.phone || selectedCustomer.whatsapp || 'لا يوجد رقم'}
                </span>
              </div>
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
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput 
            placeholder="ابحث بالاسم أو رقم الجوال..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {searchValue ? "لم يتم العثور على عملاء مطابقين" : "لا توجد عملاء"}
            </CommandEmpty>
            <CommandGroup>
              {filteredCustomers.map((customer) => {
                const primaryPhone = customer.phone || customer.whatsapp;
                
                return (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.name} ${customer.phone || ''} ${customer.whatsapp || ''}`}
                    onSelect={() => {
                      onValueChange(customer.id === value ? "" : customer.id);
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="flex items-center gap-3 p-3"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === customer.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="font-medium truncate">{customer.name}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {primaryPhone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{primaryPhone}</span>
                            </div>
                          )}
                          {customer.phone && customer.whatsapp && customer.phone !== customer.whatsapp && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{customer.whatsapp}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}