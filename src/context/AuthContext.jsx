import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { AuthContext } from './authContextBase'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      if (!session?.user) {
        if (isMounted) {
          setProfile(null)
          setProfileLoading(false)
        }
        return
      }

      if (isMounted) setProfileLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre_completo, rol, activo')
        .eq('id', session.user.id)
        .single()

      if (!isMounted) return
      setProfile(error ? null : data)
      setProfileLoading(false)
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [session])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email, password, nombreCompleto) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre_completo: nombreCompleto } },
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    rol: profile?.rol ?? null,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
