import { DataProvider } from "@refinedev/core";
import axios, { AxiosInstance } from "axios";

const axiosInstance = axios.create();

// Add API Key to all requests
axiosInstance.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem("apiKey");
  if (apiKey && config.url && !config.url.includes('/admin/')) {
    config.headers["X-API-Key"] = apiKey;
  }
  const adminKey = localStorage.getItem("adminApiKey");
  if (adminKey && config.url && config.url.includes('/admin/')) {
    config.headers["X-Admin-API-Key"] = adminKey;
  }
  return config;
});

export const dataProvider = (
  apiUrl: string,
  httpClient: AxiosInstance = axiosInstance
): Omit<
  Required<DataProvider>,
  "createMany" | "updateMany" | "deleteMany"
> => ({
  getList: async ({ resource, pagination, filters, sorters }) => {
    const url = `${apiUrl}/${resource}`;

    const { current = 1, pageSize = 10, mode = "server" } = pagination ?? {};

    const query: {
      limit?: number;
      offset?: number;
    } = {};

    if (mode === "server") {
      query.limit = pageSize;
      query.offset = (current - 1) * pageSize;
    }

    const { data } = await httpClient.get(url, {
      params: query,
    });

    // Handle both paginated and non-paginated responses
    if (Array.isArray(data)) {
      return {
        data,
        total: data.length,
      };
    }

    return {
      data: data.data || data.recordings || data.users || [],
      total: data.total || 0,
    };
  },

  getOne: async ({ resource, id }) => {
    // For recordings, we need platform/meeting_id format
    const url = `${apiUrl}/${resource}/${id}`;

    const { data } = await httpClient.get(url);

    return {
      data,
    };
  },

  create: async ({ resource, variables }) => {
    const url = `${apiUrl}/${resource}`;

    const { data } = await httpClient.post(url, variables);

    return {
      data,
    };
  },

  update: async ({ resource, id, variables }) => {
    const url = `${apiUrl}/${resource}/${id}`;

    const { data } = await httpClient.patch(url, variables);

    return {
      data,
    };
  },

  deleteOne: async ({ resource, id }) => {
    const url = `${apiUrl}/${resource}/${id}`;

    const { data } = await httpClient.delete(url);

    return {
      data,
    };
  },

  getApiUrl: () => apiUrl,

  custom: async ({ url, method, filters, sorters, payload, query, headers }) => {
    let requestUrl = `${url}`;

    if (headers) {
      httpClient.defaults.headers.common = {
        ...httpClient.defaults.headers.common,
        ...headers,
      };
    }

    let axiosResponse;
    switch (method) {
      case "put":
      case "post":
      case "patch":
        axiosResponse = await httpClient[method](url, payload);
        break;
      case "delete":
        axiosResponse = await httpClient.delete(url, {
          data: payload,
        });
        break;
      default:
        axiosResponse = await httpClient.get(requestUrl, {
          params: query,
        });
        break;
    }

    const { data } = axiosResponse;

    return Promise.resolve({ data });
  },
});
