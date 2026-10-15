import { useEffect, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import api from '../api/client'

/**
 * "Sign in with Google" via Google Identity Services.
 * The Client ID comes from the backend (/api/config) so it is set in one place: Backend/.env.
 * Google returns an ID token (credential) which we hand to onCredential.
 */
export default function GoogleLoginButton({ onCredential, onError, text = 'signin_with' }) {
  const [clientId, setClientId] = useState(undefined)

  useEffect(() => {
    api
      .get('/config')
      .then((res) => setClientId(res.data.google_client_id || null))
      .catch(() => setClientId(null))
  }, [])

  if (clientId === undefined) return <div className="h-10" />

  if (!clientId) {
    return (
      <p className="rounded-md border border-dashed border-line px-3 py-2 text-center text-xs text-muted">
        Google Sign-In is not configured yet. Set GOOGLE_CLIENT_ID in Backend/.env.
      </p>
    )
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(response) => onCredential(response.credential)}
          onError={() => onError('Google sign-in was cancelled or failed.')}
          text={text}
          shape="rectangular"
          width="320"
        />
      </div>
    </GoogleOAuthProvider>
  )
}
