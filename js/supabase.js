// supabase.js — inicializa la conexión y ofrece utilidades de autenticación
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Rellena estos valores copiándolos de tu proyecto:
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

export async function requireAuth(){
  const { data: { session } } = await supabase.auth.getSession();
  if(session) return session.user.email;

  // Intentar recuperar con el hash de redirect
  const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
  if(!error && data.session) return data.session.user.email;

  // Si no hay sesión, pedir email (ya que estamos en Tema 1)
  let email = prompt('Introduce tu correo institucional para continuar:');
  if(!email) throw new Error('Se requiere autenticación');
  const { error: err } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } });
  if(err){ alert('No se pudo enviar el enlace: '+err.message); throw err; }
  alert('Revisa tu correo y vuelve a esta ventana tras hacer clic en el enlace.');
  throw new Error('Pendiente de verificación por email');
}
