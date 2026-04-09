import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar"; // Verifique se o caminho do import da Sidebar está correto

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar Fixa à esquerda */}
      <Sidebar />

      {/* Área de conteúdo que muda conforme a rota */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="container mx-auto py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}