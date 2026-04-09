// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { auth, googleProvider, registerNotificationToken } from "@/lib/firebase";
import { signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regSenha, setRegSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/Dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!loginEmail || !loginSenha) return toast.error("Preencha todos os campos.");
    try {
      setLoading(true);
      await login(loginEmail, loginSenha);
      // pega o usuário atual do Firebase Auth e registra o token
      const currentUser = auth.currentUser;
      if (currentUser) {
        await registerNotificationToken(currentUser);
      }
      toast.success("Bem-vindo de volta!");
      navigate("/Dashboard");
    } catch (error) {
      toast.error("Email ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!regEmail || !regSenha) return toast.error("Preencha todos os campos.");
    if (regSenha.length < 6) return toast.error("A senha deve ter 6+ caracteres.");
    try {
      setLoading(true);
      await register(regEmail, regSenha);
      // após registro, pega o usuário atual e registra o token
      const currentUser = auth.currentUser;
      if (currentUser) {
        await registerNotificationToken(currentUser);
      }
      toast.success("Conta criada com sucesso!");
      navigate("/Dashboard");
    } catch (error) {
      toast.error("Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      // registra o token FCM usando o usuário retornado pelo Google
      if (result?.user) {
        await registerNotificationToken(result.user);
      } else {
        const currentUser = auth.currentUser;
        if (currentUser) await registerNotificationToken(currentUser);
      }
      toast.success("Acesso via Google autorizado!");
      navigate("/Dashboard");
    } catch (error) {
      toast.error("Falha na autenticação com Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!loginEmail) return toast.error("Digite seu e-mail no campo acima.");
    try {
      await sendPasswordResetEmail(auth, loginEmail);
      toast.success("Link de recuperação enviado para seu e-mail!");
    } catch (error) {
      toast.error("Erro ao processar solicitação.");
    }
  };

  if (user) return null;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex items-center justify-center overflow-hidden bg-[#020617] notranslate">
      
      {/* EFEITOS DE FUNDO (Gradientes Suaves em vez de Imagem) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[380px] px-6">
        
        {/* HEADER */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-3 w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <Lock className="text-cyan-400 w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic">FLOW</h1>
          <p className="text-cyan-500/60 text-[9px] font-bold uppercase tracking-[0.4em] mt-1">
            Controle Financeiro Pessoal
          </p>
        </div>

        {/* CARD DE LOGIN */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl">
          <CardContent className="pt-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 mb-6 border border-white/5">
                <TabsTrigger value="login" className="text-xs uppercase font-bold tracking-widest">Entrar</TabsTrigger>
                <TabsTrigger value="register" className="text-xs uppercase font-bold tracking-widest">Criar</TabsTrigger>
              </TabsList>

              {/* ABA LOGIN */}
              <TabsContent value="login" className="space-y-4 outline-none">
                <div className="space-y-2">
                  <Label className="text-slate-400 ml-1 text-[10px] uppercase font-bold tracking-widest">Email</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    className="bg-black/30 border-white/10 text-white h-12 focus:border-cyan-500 transition-all text-sm"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <Label className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Senha</Label>
                    <button onClick={handleResetPassword} type="button" className="text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors uppercase font-bold">
                      Esqueceu?
                    </button>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••"
                    className="bg-black/30 border-white/10 text-white h-12 focus:border-cyan-500 transition-all text-sm"
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Acessar Painel"}
                </Button>
              </TabsContent>

              {/* ABA CADASTRO */}
              <TabsContent value="register" className="space-y-4 outline-none">
                <div className="space-y-2">
                  <Label className="text-slate-400 ml-1 text-[10px] uppercase font-bold tracking-widest">Email</Label>
                  <Input
                    type="email"
                    className="bg-black/30 border-white/10 text-white h-12 text-sm"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400 ml-1 text-[10px] uppercase font-bold tracking-widest">Senha</Label>
                  <Input
                    type="password"
                    className="bg-black/30 border-white/10 text-white h-12 text-sm"
                    value={regSenha}
                    onChange={(e) => setRegSenha(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest transition-all"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Criar Minha Conta"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-8">
            <div className="relative w-full flex items-center justify-center">
              <span className="absolute inset-x-0 h-[1px] bg-white/5"></span>
              <span className="relative bg-[#0f172a] px-3 text-[9px] uppercase text-slate-500 font-bold tracking-[0.2em]">Social Access</span>
            </div>

            <Button
              variant="outline"
              className="w-full h-12 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold uppercase tracking-widest"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </Button>
          </CardFooter>
        </Card>

        <p className="mt-8 text-center text-[9px] text-slate-600 font-bold tracking-widest uppercase opacity-60">
          &copy; 2026 FLOW - Systems Analyst
        </p>
      </div>
    </div>
  );
}
