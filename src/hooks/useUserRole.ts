// src/hooks/useUserRole.ts (inchangé, mais on l'utilise mieux)
import { useState, useEffect } from 'react';

export function useUserRole() {
  const [role, setRole] = useState(() => localStorage.getItem('userRole') || 'confirmateur');

  useEffect(() => {
    const handleChange = () => {
      const newRole = localStorage.getItem('userRole') || 'confirmateur';
      setRole(newRole);
    };

    window.addEventListener('storage', handleChange);

    // Détection dans le même onglet (localStorage ne trigger pas 'storage')
    const interval = setInterval(handleChange, 200);

    return () => {
      window.removeEventListener('storage', handleChange);
      clearInterval(interval);
    };
  }, []);

  return role;
}