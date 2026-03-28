import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isSuspended?: boolean;
      isSoftDeleted?: boolean;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isSuspended?: boolean;
    isSoftDeleted?: boolean;
    passwordSignature?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: string;
    isSuspended?: boolean;
    isSoftDeleted?: boolean;
    passwordSignature?: string;
    sessionRevoked?: boolean;
  }
}
