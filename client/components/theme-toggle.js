"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const { updateProfile, user } = useAuth();

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    if (user) {
      try {
        await updateProfile({ theme: newTheme });
      } catch (error) {
        console.error("Gagal menyimpan tema", error);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-muted/60 transition-colors">
          <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-[1.15rem] w-[1.15rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
          <span className="sr-only">Ubah Tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-2xl border-border/80 shadow-xl p-1">
        <DropdownMenuItem onClick={() => handleThemeChange("light")} className="rounded-xl text-xs font-medium cursor-pointer">
          <Sun className="mr-2 h-3.5 w-3.5 text-amber-500" />
          <span>Terang</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")} className="rounded-xl text-xs font-medium cursor-pointer">
          <Moon className="mr-2 h-3.5 w-3.5 text-indigo-400" />
          <span>Gelap</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")} className="rounded-xl text-xs font-medium cursor-pointer">
          <Monitor className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          <span>Sistem</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
