import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('clickart_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('clickart_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('clickart_user');
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const isSeller = () => {
    return user && user.seller_id;
  };

  const isCustomer = () => {
    return user && user.user_id;
  };

  const isAdmin = () => {
    return user && user.type === 'admin';
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    isSeller,
    isCustomer,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};