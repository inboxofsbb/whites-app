import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";

const apiClient = () => {
  const defaultOptions = {
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    timeout: 150000,
  };

  const instance = axios.create(defaultOptions);

  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {

    const session: any = await getSession();
    if (session) {
      if (config.headers)
        config.headers.Authorization = `Bearer ${session.jwt}`;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      console.log(error);
      throw new Error(error?.response?.data);
    }
  );

  return instance;
};

export default apiClient();
