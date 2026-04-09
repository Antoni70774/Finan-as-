// src/lib/AuthProvider.jsx
import { createContext, useContext, useState } from "react";
import { registerNotificationToken } from "./firebase"; // importa a função

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (userData) => {
    setUser(userData);
    // registra o token FCM no Firestore
    await registerNotificationToken(userData);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
