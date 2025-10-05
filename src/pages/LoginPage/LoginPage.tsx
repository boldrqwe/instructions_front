import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/model/auth';

export function LoginPage() {
  const { login } = useAuth();
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = (loc.state as any)?.from ?? '/';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = await login(u, p);
    if (!ok) return setErr('Не удалось войти');
    nav(redirectTo, { replace: true });
  }

  return (
    <div style={{ maxWidth: 420, margin: '24px auto' }}>
      <h1>Войти</h1>
      <form onSubmit={onSubmit}>
        <input placeholder="Логин" value={u} onChange={e=>setU(e.target.value)} required style={{width:'100%',marginBottom:12}}/>
        <input placeholder="Пароль" type="password" value={p} onChange={e=>setP(e.target.value)} required style={{width:'100%',marginBottom:12}}/>
        {err && <div style={{color:'red', marginBottom:12}}>{err}</div>}
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}
