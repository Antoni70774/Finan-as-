import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CalculatorList from "../components/calculators/CalculatorList";
import CalculatorDetail from "../components/calculators/CalculatorDetail";

export default function Calculators() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Calculadoras</h1>
              <p className="text-sm text-muted-foreground">Ferramentas financeiras inteligentes</p>
            </div>
            <CalculatorList onSelect={setSelected} />
          </motion.div>
        ) : (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <Button variant="ghost" className="mb-4 gap-2 -ml-2" onClick={() => setSelected(null)}>
              <ArrowLeft className="w-4 h-4" /> Calculadoras
            </Button>
            <CalculatorDetail calculator={selected} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}