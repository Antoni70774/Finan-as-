import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CalcField({ label, value, onChange, type = "number", placeholder, min, step = "any" }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        className="h-10"
      />
    </div>
  );
}

export function CalcResult({ results }) {
  if (!results || results.length === 0) return null;
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 space-y-2">
        {results.map((r, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className="text-sm font-semibold text-primary">{r.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CalcButton({ onClick, children = "Calcular" }) {
  return (
    <Button onClick={onClick} className="w-full">{children}</Button>
  );
}