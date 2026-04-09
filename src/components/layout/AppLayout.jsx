import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="notranslate">
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <MobileNav />
          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
