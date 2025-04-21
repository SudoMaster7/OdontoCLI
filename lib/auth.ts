// lib/auth.ts

export interface User {
    email: string;
    password: string;
    role: "admin" | "dentista";
  }
  
  const users: User[] = [
    { email: "admin@clinic.com", password: "admin123", role: "admin" },
    { email: "dentista@clinic.com", password: "dentista123", role: "dentista" },
  ];
  
  export function authenticate(email: string, password: string): User | null {
    return users.find((u) => u.email === email && u.password === password) || null;
  }
  