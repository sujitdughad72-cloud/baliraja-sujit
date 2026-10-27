/**
 * BaliRaja API Client
 * Connects React Frontend with Java Spring Boot REST API (default http://localhost:8080/api)
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('baliraja_jwt_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  auth: {
    register: async (payload: any) => {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Registration failed');
      const data = await res.json();
      if (data.token) localStorage.setItem('baliraja_jwt_token', data.token);
      return data;
    },
    login: async (payload: { identifier: string; password: string }) => {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Login failed');
      const data = await res.json();
      if (data.token) localStorage.setItem('baliraja_jwt_token', data.token);
      return data;
    },
    logout: () => {
      localStorage.removeItem('baliraja_jwt_token');
    },
  },

  // Products & Marketplace
  products: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/products`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    getById: async (id: number | string) => {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch product details');
      return res.json();
    },
    search: async (query: string) => {
      const res = await fetch(`${API_BASE_URL}/products/search?q=${encodeURIComponent(query)}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to search products');
      return res.json();
    },
    getByCategory: async (categoryId: number | string) => {
      const res = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch category products');
      return res.json();
    },
    create: async (farmerId: number | string, product: any) => {
      const res = await fetch(`${API_BASE_URL}/products?farmerId=${farmerId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create product');
      return res.json();
    },
    update: async (id: number | string, product: any) => {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to update product');
      return res.json();
    },
    delete: async (id: number | string) => {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete product');
      return true;
    },
  },

  // Categories
  categories: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/categories`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
  },

  // Orders
  orders: {
    create: async (buyerId: number | string, orderData: any) => {
      const res = await fetch(`${API_BASE_URL}/orders?buyerId=${buyerId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create order');
      return res.json();
    },
    getById: async (id: number | string) => {
      const res = await fetch(`${API_BASE_URL}/orders/${id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json();
    },
    updateStatus: async (id: number | string, status: string) => {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
  },

  // Farmers
  farmers: {
    getProfile: async (farmerId: number | string) => {
      const res = await fetch(`${API_BASE_URL}/farmers/${farmerId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch farmer profile');
      return res.json();
    },
    getProducts: async (farmerId: number | string) => {
      const res = await fetch(`${API_BASE_URL}/farmers/${farmerId}/products`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch farmer products');
      return res.json();
    },
    getOrders: async (farmerId: number | string) => {
      const res = await fetch(`${API_BASE_URL}/farmers/${farmerId}/orders`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch farmer orders');
      return res.json();
    },
  },

  // Buyers
  buyers: {
    getProfile: async (buyerId: number | string) => {
      const res = await fetch(`${API_BASE_URL}/buyers/${buyerId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch buyer profile');
      return res.json();
    },
    getOrders: async (buyerId: number | string) => {
      const res = await fetch(`${API_BASE_URL}/buyers/${buyerId}/orders`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch buyer orders');
      return res.json();
    },
  },

  // APMC Mandi Rates
  marketPrices: {
    getLatest: async () => {
      const res = await fetch(`${API_BASE_URL}/market-prices`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch market prices');
      return res.json();
    },
    getByCrop: async (cropName: string) => {
      const res = await fetch(`${API_BASE_URL}/market-prices/crop/${encodeURIComponent(cropName)}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch crop market prices');
      return res.json();
    },
    getByDistrict: async (district: string) => {
      const res = await fetch(`${API_BASE_URL}/market-prices/district/${encodeURIComponent(district)}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch district market prices');
      return res.json();
    },
  },

  // AI Farming Assistant (Calls Spring Boot → Python FastAPI microservice)
  ai: {
    recommendCrop: async (payload: {
      nitrogen: number;
      phosphorus: number;
      potassium: number;
      ph?: number;
      temperature?: number;
      rainfall?: number;
      humidity?: number;
      soilType?: string;
      district?: string;
    }) => {
      const res = await fetch(`${API_BASE_URL}/ai/crop-recommendation`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Crop recommendation failed');
      return res.json();
    },

    predictDisease: async (payload: { cropName?: string; imageBase64?: string; symptoms?: string }) => {
      const res = await fetch(`${API_BASE_URL}/ai/disease-prediction`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Disease prediction failed');
      return res.json();
    },

    analyzeSoil: async (payload: {
      targetCrop?: string;
      nitrogen: number;
      phosphorus: number;
      potassium: number;
      ph?: number;
      organicCarbon?: number;
      landAreaAcres?: number;
    }) => {
      const res = await fetch(`${API_BASE_URL}/ai/soil-analysis`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Soil analysis failed');
      return res.json();
    },
  },

  // IoT Soil & NPK Sensors
  sensors: {
    submitReading: async (reading: any) => {
      // First try local server route
      try {
        const res = await fetch('/api/sensors/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reading),
        });
        if (res.ok) return await res.json();
      } catch (e) {
        // Fallback to Spring Boot or direct response
      }
      return { success: true, reading };
    },
    getLatest: async () => {
      try {
        const res = await fetch('/api/sensors/latest');
        if (res.ok) {
          const data = await res.json();
          return data.reading;
        }
      } catch (e) {
        // Fallback
      }
      return null;
    },
    getHistory: async (limit: number = 25) => {
      try {
        const res = await fetch(`/api/sensors/history?limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          return data.history;
        }
      } catch (e) {
        // Fallback
      }
      return [];
    },
  },
};
