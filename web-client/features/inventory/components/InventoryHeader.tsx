import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  total: number;
  search: string;
  searchOpen: boolean;
  onSearch: (value: string) => void;
  onToggleSearch: () => void;
  onAdd: () => void;
}

export function InventoryHeader({ total, search, searchOpen, onSearch, onToggleSearch, onAdd }: Props): React.JSX.Element {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-headline-lg-mobile">Inventory</h1>
          <p className="mt-0.5 text-body-sm text-muted-foreground">
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary" />
            <span className="numeric-tabular font-semibold text-foreground">{total}</span> portions available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Search stored items" aria-expanded={searchOpen} aria-controls="inventory-search" onClick={onToggleSearch} className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <Search size={20} aria-hidden="true" />
          </button>
          <button type="button" onClick={onAdd} className="flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-label-md font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <Plus size={20} aria-hidden="true" /> Add Item
          </button>
        </div>
      </div>
      {searchOpen && (
        <Input id="inventory-search" type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search inventory" aria-label="Search inventory" className="h-11 bg-card" />
      )}
    </div>
  );
}
