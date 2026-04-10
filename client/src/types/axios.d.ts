/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipAuthRedirect?: boolean;
  }

  export interface InternalAxiosRequestConfig<D = any> {
    _retry?: boolean;
    skipAuthRefresh?: boolean;
    skipAuthRedirect?: boolean;
  }
}
