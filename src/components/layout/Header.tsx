import { Bell, User } from "lucide-react";

export function Header({ title }: { title: string }) {
  return (
    <header className="h-20 px-8 flex items-center justify-between border-b border-outline-variant/20 bg-background/50 backdrop-blur-md sticky top-0 z-10">
      <h2 className="font-headline-lg text-on-surface">{title}</h2>
      
      <div className="flex items-center gap-6">
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <Bell size={24} />
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-outline-variant/30">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
            <User size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-label-md text-on-surface">System Admin</span>
            <span className="font-label-sm text-on-surface-variant">Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
