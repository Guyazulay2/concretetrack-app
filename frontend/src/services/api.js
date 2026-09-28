import axios from 'axios'

const BACKEND = 'https://concretetrack-backend.onrender.com'

const api = axios.create({
  baseURL: BACKEND + '/api',
  timeout: 30000,
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ct_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ct_user')
      localStorage.removeItem('ct_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const getEntriesByRegion = ()               => api.get('/entries/by-region')
export const getEntries         = (params)         => api.get('/entries/', { params })
export const getCollected       = ()               => api.get('/entries/collected')
export const createEntry        = (data)           => api.post('/entries/', data)

export const uploadMedia = (id, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/entries/${id}/media`, fd)
}

export const markCollected = (id, collector_name, notes) =>
  api.post(`/entries/${id}/collect`, { collector_name, notes })

// ביטול = מחיקה מוחלטת מה-DB וה-S3
export const cancelEntry  = (id) => api.delete(`/entries/${id}`)
export const deleteEntry  = (id) => api.delete(`/entries/${id}`)

export const getDashboardStats = () => api.get('/stats/dashboard')
export const getUsers          = ()  => api.get('/users/')
export const createUser        = (d) => api.post('/users/', d)
export const getActivity       = ()  => api.get('/activity/')
