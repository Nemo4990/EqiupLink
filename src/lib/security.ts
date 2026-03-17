import { supabase } from './supabase';

export interface DeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
}

export function parseDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;

  let browser = 'Unknown Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Chromium/')) browser = 'Chromium';

  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  const deviceName = `${browser} on ${os}`;

  return { deviceName, browser, os };
}

export function getDeviceFingerprint(): string {
  const { deviceName } = parseDeviceInfo();
  const lang = navigator.language || '';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const screen = `${window.screen.width}x${window.screen.height}`;
  return btoa(`${deviceName}:${lang}:${tz}:${screen}`).slice(0, 40);
}

export async function recordSession(userId: string): Promise<string> {
  const { deviceName, browser, os } = parseDeviceInfo();
  const fingerprint = getDeviceFingerprint();

  const existingToken = sessionStorage.getItem('eq_session_token');

  if (existingToken) {
    await supabase
      .from('user_sessions')
      .update({ last_active: new Date().toISOString(), is_current: true })
      .eq('session_token', existingToken)
      .eq('user_id', userId);
    return existingToken;
  }

  const sessionToken = `${fingerprint}_${Date.now()}`;

  await supabase.from('user_sessions').insert({
    user_id: userId,
    session_token: sessionToken,
    device_name: deviceName,
    browser,
    os,
    ip_address: 'Client IP',
    is_current: true,
    last_active: new Date().toISOString(),
  });

  sessionStorage.setItem('eq_session_token', sessionToken);
  return sessionToken;
}

export async function isNewDevice(userId: string): Promise<boolean> {
  const fingerprint = getDeviceFingerprint();
  const { data } = await supabase
    .from('user_sessions')
    .select('id')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .limit(20);

  if (!data || data.length === 0) return true;

  const currentTokenPrefix = fingerprint;
  const { data: matchingSessions } = await supabase
    .from('user_sessions')
    .select('session_token')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .ilike('session_token', `${currentTokenPrefix}%`);

  return !matchingSessions || matchingSessions.length === 0;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await supabase
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString(), is_current: false })
    .eq('id', sessionId);
}

export async function revokeCurrentSession(userId: string): Promise<void> {
  const token = sessionStorage.getItem('eq_session_token');
  if (token) {
    await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString(), is_current: false })
      .eq('session_token', token)
      .eq('user_id', userId);
    sessionStorage.removeItem('eq_session_token');
  }
}

export async function updateSessionActivity(userId: string): Promise<void> {
  const token = sessionStorage.getItem('eq_session_token');
  if (!token) return;
  await supabase
    .from('user_sessions')
    .update({ last_active: new Date().toISOString() })
    .eq('session_token', token)
    .eq('user_id', userId);
}

export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  await supabase.from('login_attempts').insert({
    email: email.toLowerCase(),
    success,
    ip_address: 'Client',
  });
}

export async function checkRateLimit(email: string): Promise<{ blocked: boolean; remaining: number; resetIn: number }> {
  const windowMs = 5 * 60 * 1000;
  const maxAttempts = 5;
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  const { data, error } = await supabase
    .from('login_attempts')
    .select('id, attempted_at, success')
    .eq('email', email.toLowerCase())
    .eq('success', false)
    .gte('attempted_at', cutoff)
    .order('attempted_at', { ascending: false });

  if (error || !data) return { blocked: false, remaining: maxAttempts, resetIn: 0 };

  const failCount = data.length;
  const remaining = Math.max(0, maxAttempts - failCount);
  const blocked = failCount >= maxAttempts;

  let resetIn = 0;
  if (blocked && data.length > 0) {
    const oldest = new Date(data[data.length - 1].attempted_at).getTime();
    resetIn = Math.max(0, Math.ceil((oldest + windowMs - Date.now()) / 1000));
  }

  return { blocked, remaining, resetIn };
}

export async function logSecurityEvent(
  userId: string | null,
  eventType: string,
  deviceName?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabase.from('security_events').insert({
    user_id: userId,
    event_type: eventType,
    device_name: deviceName || parseDeviceInfo().deviceName,
    metadata: metadata || {},
  });
}

export async function sendNewDeviceNotification(userId: string, deviceName: string): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'New Device Login Detected',
    message: `A login was detected from a new device: ${deviceName}. If this wasn't you, please secure your account immediately.`,
    type: 'warning',
  });
}
