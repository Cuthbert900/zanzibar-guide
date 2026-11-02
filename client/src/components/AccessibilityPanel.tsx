import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAccessibility } from "@/contexts/AccessibilityContext";

export function AccessibilityPanel() {
  const { largeText, highContrast, reduceMotion, setLargeText, setHighContrast, setReduceMotion } =
    useAccessibility();

  return (
    <Card className="p-3 border-border/50 space-y-3" aria-label="Accessibility settings">
      <p className="text-xs font-semibold">Accessibility</p>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="a11y-large" className="text-xs">
          Larger text
        </Label>
        <Switch id="a11y-large" checked={largeText} onCheckedChange={setLargeText} aria-label="Toggle larger text" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="a11y-contrast" className="text-xs">
          High contrast
        </Label>
        <Switch
          id="a11y-contrast"
          checked={highContrast}
          onCheckedChange={setHighContrast}
          aria-label="Toggle high contrast"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="a11y-motion" className="text-xs">
          Reduce motion
        </Label>
        <Switch
          id="a11y-motion"
          checked={reduceMotion}
          onCheckedChange={setReduceMotion}
          aria-label="Toggle reduce motion"
        />
      </div>
    </Card>
  );
}
