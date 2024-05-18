import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import { Paintbrush } from "lucide-react";

const hexColorPickerStyle = {
  width: "100%",
};

export const colors = [
  "#E2E2E2",
  "#ff75c3",
  "#ffa647",
  "#ffe83f",
  "#9fff5b",
  "#70e2ff",
  "#cd93ff",
  "#475569",
  "#cbd5e1",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#65a30d",
  "#0891b2",
  "#9333ea",
  "#09203f",
];

export function ColorPicker({
  background,
  setBackground,
  className,
}: {
  background: string;
  setBackground: (background: string) => void;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[220px] justify-start text-left font-normal",
            !background && "text-muted-foreground",
            className
          )}
        >
          <div className="w-full flex items-center gap-2">
            {background ? (
              <div
                className="h-4 w-4 rounded !bg-center !bg-cover transition-all"
                style={{ background }}
              ></div>
            ) : (
              <Paintbrush className="h-4 w-4" />
            )}
            <div className="truncate flex-1">
              {background ? background : "Pick a color"}
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-4">
        <HexColorPicker
          color={background}
          onChange={setBackground}
          style={hexColorPickerStyle}
        />
        <div className="grid grid-cols-6 lg:grid-cols-8 gap-2 w-full">
          {colors.map((s) => (
            <div
              key={s}
              style={{ background: s }}
              className={cn(
                "rounded-md h-6 w-6 cursor-pointer active:scale-105",
                {
                  "ring-2 ring-foreground": s === background,
                }
              )}
              onClick={() => setBackground(s)}
            />
          ))}
        </div>
        <Input
          id="custom"
          value={background}
          className="w-full h-8"
          onChange={(e) => setBackground(e.currentTarget.value)}
        />
      </PopoverContent>
    </Popover>
  );
}
