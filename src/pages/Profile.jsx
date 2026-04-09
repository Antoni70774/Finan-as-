// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    job: "",
  });

  // Carregar perfil do documento users/{uid}
  useEffect(() => {
    const carregarPerfil = async () => {
      if (!user) return;
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data().profile || {});
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        toast({ title: "Erro ao carregar perfil", variant: "destructive" });
      }
    };
    carregarPerfil();
  }, [user]);

  // Salvar perfil dentro de users/{uid}
  const salvarPerfil = async () => {
    if (!user) return;
    try {
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, { profile }, { merge: true });
      toast({ title: "Perfil atualizado!", duration: 1000 });
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      toast({ title: "Erro ao salvar perfil", variant: "destructive" });
    }
  };

  return (
    <Card className="max-w-lg mx-auto mt-6">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback>{profile.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <Input
            placeholder="Nome"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Profissão</Label>
          <Input
            value={profile.job}
            onChange={(e) => setProfile({ ...profile, job: e.target.value })}
          />
        </div>

        <Button onClick={salvarPerfil} className="w-full bg-violet-600">
          <Save className="w-4 h-4 mr-2" /> Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
