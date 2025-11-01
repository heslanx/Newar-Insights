import { AuthProvider } from "@refinedev/core";

export const authProvider: AuthProvider = {
  login: async ({ apiKey, adminApiKey }) => {
    if (apiKey) {
      localStorage.setItem("apiKey", apiKey);
    }
    if (adminApiKey) {
      localStorage.setItem("adminApiKey", adminApiKey);
    }
    return {
      success: true,
      redirectTo: "/",
    };
  },
  logout: async () => {
    localStorage.removeItem("apiKey");
    localStorage.removeItem("adminApiKey");
    return {
      success: true,
      redirectTo: "/login",
    };
  },
  check: async () => {
    const apiKey = localStorage.getItem("apiKey");
    if (apiKey) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      logout: true,
      redirectTo: "/login",
    };
  },
  getPermissions: async () => null,
  getIdentity: async () => {
    const apiKey = localStorage.getItem("apiKey");
    if (apiKey) {
      return {
        id: 1,
        name: "Admin User",
        avatar: "https://i.pravatar.cc/300",
      };
    }
    return null;
  },
  onError: async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return {
        logout: true,
      };
    }

    return { error };
  },
};
