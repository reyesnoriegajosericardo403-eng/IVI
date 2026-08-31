// Traduce los mensajes crudos de Supabase Auth (en inglés, pensados para
// desarrolladores) a español claro y accionable — spec: un amigo reportó
// "Invalid Logic credentials" (en realidad "Invalid login credentials")
// sin entender qué hacer con eso.
export function translateAuthError(rawMessage: string | undefined): string {
  const msg = (rawMessage || '').toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'No encontramos una cuenta con ese correo y esa contraseña. Si es tu primera vez aquí, toca "Crea tu cuenta" abajo. Si ya tienes cuenta, revisa que la contraseña esté bien escrita o recupérala.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Todavía no confirmas tu correo. Revisa tu bandeja de entrada (y la carpeta de spam) y toca el enlace que te mandamos antes de iniciar sesión.';
  }
  if (msg.includes('already registered') || msg.includes('user already exists')) {
    return 'Ya existe una cuenta con ese correo. Usa "Inicia sesión" en vez de crear una cuenta nueva, o recupera tu contraseña si no la recuerdas.';
  }
  if (msg.includes('password should be at least') || msg.includes('password is too short')) {
    return 'Tu contraseña debe tener al menos 6 caracteres.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Hiciste muchos intentos seguidos. Espera un par de minutos y vuelve a intentarlo.';
  }
  if (msg.includes('token has expired') || msg.includes('invalid or expired') || msg.includes('otp_expired')) {
    return 'Este enlace ya venció o ya se usó. Pide uno nuevo.';
  }
  if (msg.includes('unable to validate email') || msg.includes('invalid email')) {
    return 'Ese correo no parece válido. Revísalo e intenta de nuevo.';
  }
  if (msg.includes('same_password') || msg.includes('should be different')) {
    return 'La nueva contraseña debe ser distinta a la anterior.';
  }
  if (!rawMessage) return 'Algo salió mal. Intenta de nuevo.';
  return rawMessage;
}
