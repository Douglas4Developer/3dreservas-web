import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface LocationState {
  from?: {
    pathname?: string
  }
}

export default function LoginPage() {
  const { login, isDemoMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LocationState | null
  const redirectTo = locationState?.from?.pathname || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Não foi possível autenticar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="screen-center login-page">
      <div className="card login-card">
        <span className="eyebrow">Painel administrativo</span>
        <img src="/logopng.png" alt="3DReservas" style={{ height: '100px', display: 'block', margin: '0 auto 16px' }} />
        <h1>Entrar no 3DReservas</h1>
        <p>
          Use o usuário liberado para acessar o painel administrativo. {isDemoMode ? 'Como o Supabase ainda não está configurado, qualquer e-mail e senha acessam o modo demonstração.' : ''}
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
