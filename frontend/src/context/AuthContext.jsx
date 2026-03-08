import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

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

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    isSeller,
    isCustomer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};