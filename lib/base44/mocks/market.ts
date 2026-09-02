import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  marketCategories,
  marketProducts,
  marketResellers,
} from "./marketData";

const CATALOG_URL = /^\/market\/catalog$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toResponse(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

function getCatalog() {
  return {
    categories: clone(marketCategories),
    products: clone(marketProducts),
    resellers: clone(marketResellers),
  };
}

export function marketMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && CATALOG_URL.test(url)) {
    return async () => toResponse(getCatalog());
  }

  return null;
}
