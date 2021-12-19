/*
 * @Author: Innei
 * @Date: 2020-05-07 16:04:24
 * @LastEditTime: 2020-08-16 21:43:44
 * @LastEditors: Innei
 * @FilePath: /mx-web/utils/request.ts
 * @MIT
 */

import axios, { AxiosError } from 'axios'
import camelcaseKeys from 'camelcase-keys'
import { message } from 'utils/message'
import { getToken } from './cookie'
import { isClientSide, isServerSide } from './utils'
const service = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APIURL || '/api/v2',
  // withCredentials: true,
  timeout: 10000,
})

service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token && config.headers) {
      config.headers['Authorization'] = 'bearer ' + getToken()
    }

    return config
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(error.message)
    }

    return Promise.reject(error)
  },
)

service.interceptors.response.use(
  (response) => {
    const res = camelcaseKeys(response.data, { deep: true })

    return res
  },
  (error: AxiosError<Record<string, any> | undefined>) => {
    // 处理网络中断的问题
    if (
      !error.response ||
      error.response.status === 408 ||
      error.code === 'ECONNABORTED'
    ) {
      const next = ({
        data,
        statusCode,
      }: {
        data?: string
        statusCode?: number
      }) => {
        if (typeof document !== 'undefined') {
          data && message.error(data)
        }
        Promise.reject({
          statusCode,
          data,
          message: data,
          toString() {
            return '网络错误'
          },
        })
      }

      return next({
        statusCode: 408,
        data: isServerSide()
          ? '上游服务器连接超时'
          : '连接超时, 请检查一下网络哦!',
      })
    }
    if (isClientSide()) {
      if (error.response.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          error.response.data.message.map((m) => {
            message.error(m)
          })
        } else message.error(error.response.data.message)
      } else {
        message.error('网络好像出现了点问题呢')
      }
    }
    const code = error.response.status
    return Promise.reject({
      statusCode: code,
      data: error.response.data,
      toString() {
        return '请求错误: ' + `[${code}]: Fetch ${error.config.url}`
      },
    })
  },
)

export default service

export { service as http }
