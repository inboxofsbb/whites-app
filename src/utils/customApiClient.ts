import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { getSession } from "next-auth/react";

const customApiClient = () => {
  const defaultOptions = {
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    timeout: 150000,
  };

  const instance = axios.create(defaultOptions);

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      console.log(`error`, error);
      throw new Error(error?.response?.data);
    }
  );

  return instance;
};

export default customApiClient();
