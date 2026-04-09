import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔐 LOGIN
  const login = async (email, senha) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, senha);
      return res;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  };

  // 📝 REGISTRO
  const register = async (email, senha) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, senha);
      return res;
    } catch (error) {
      console.error("Erro no cadastro:", error);
      throw error;
    }
  };

  // 🚪 LOGOUT
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isLoadingAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 🔥 HOOK
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa estar dentro do AuthProvider");
  }

  return context;
};