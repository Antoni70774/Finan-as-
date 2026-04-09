import React from "react";
import { motion } from "framer-motion";

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, variant = "default" }) {
  const variants = {
    default: "bg-card",
    primary: "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground",
    success: "bg-gradient-to-br from-emerald-500/90 to-emerald-600 text-white",
    danger: "bg-gradient-to-br from-red-500/90 to-red-600 text-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${variants[variant]} rounded-2xl p-5 shadow-sm border border-border/50`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider ${variant === "default" ? "text-muted-foreground" : "opacity-80"}`}>
            {title}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-semibold ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {trend >= 0 ? "+" : ""}{trend}%
              </span>
              {trendLabel && (
                <span className={`text-xs ${variant === "default" ? "text-muted-foreground" : "opacity-70"}`}>
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${variant === "default" ? "bg-primary/10" : "bg-white/15"}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}