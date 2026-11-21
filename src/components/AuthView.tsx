import React, {useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import {motion} from 'motion/react';
import {useLibrary} from '../context/LibraryContext';
import {
  evaluatePasswordStrength,
  isNicknameAvailable,
  validateNickname,
} from '../db/auth';
import {BrandLogo} from './BrandLogo';

type AuthMode = 'login' | 'register';

export const AuthView: React.FC = () => {
  const {login, register} = useLibrary();

  const [mode, setMode] = useState<AuthMode>('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nickChecking, setNickChecking] = useState(false);
  const [nickAvailable, setNickAvailable] = useState<boolean | null>(null);

  const nickValidation = useMemo(() => validateNickname(nickname), [nickname]);
  const pwStrength = useMemo(() => evaluatePasswordStrength(password), [password]);

  // Check nickname uniqueness in real time during registration
  useEffect(() => {
    if (mode !== 'register' || !nickname.trim()) {
      setNickAvailable(null);
      setNickChecking(false);
      return;
    }
    if (!nickValidation.valid) {
      setNickAvailable(null);
      setNickChecking(false);
      return;
    }
    let active = true;
    setNickChecking(true);
    const timer = setTimeout(async () => {
      try {
        const free = await isNicknameAvailable(nickname);
        if (active) setNickAvailable(free);
      } finally {
        if (active) setNickChecking(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode, nickname, nickValidation.valid]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(nickname, password);
      } else {
        await login(nickname, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить действие');
    } finally {
      setSubmitting(false);
    }
  };

  const strengthColors = [
    'bg-stone-300 dark:bg-stone-700',
    'bg-rose-400',
    'bg-amber-400',
    'bg-emerald-500',
    'bg-emerald-600',
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden"
      style={{backgroundColor: 'var(--site-bg)', color: 'var(--site-text)'}}
    >
      {/* Soft warm atmospheric paper glow */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-35 blur-3xl"
        style={{backgroundColor: 'var(--site-surface-alt)'}}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{backgroundColor: 'var(--site-accent)'}}
      />

      <motion.div
        initial={{opacity: 0, y: 16}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.35, ease: 'easeOut'}}
        className="w-full max-w-4xl rounded-3xl border overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10"
        style={{
          backgroundColor: 'var(--site-surface)',
          borderColor: 'var(--site-border)',
          boxShadow: 'var(--site-shadow)',
        }}
      >
        {/* Left Literary Atmosphere Column (Desktop) */}
        <div
          className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 border-r relative overflow-hidden"
          style={{
            backgroundColor: 'var(--site-surface-alt)',
            borderColor: 'var(--site-border)',
          }}
        >
          <div className="space-y-4 relative z-10">
            <BrandLogo size="lg" />

            <div className="pt-2 space-y-2">
              <p className="font-display text-2xl font-semibold leading-snug">
                Ваша личная библиотека, цитаты и книжный дневник
              </p>
              <p className="text-xs leading-relaxed" style={{color: 'var(--site-text-muted)'}}>
                Загружайте книги с телефона или компьютера, делайте эстетичные заметки на полях и оформляйте страницы скрапбуком.
              </p>
            </div>
          </div>

          <div className="my-6 rounded-2xl overflow-hidden border aspect-[4/3] shadow-sm" style={{borderColor: 'var(--site-border)'}}>
            <img
              src="/src/assets/images/library_hero_desk_1795238067194.jpg"
              alt="Уютный читальный стол chitay"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-1.5 relative z-10">
            <p className="font-display italic text-sm opacity-85">
              «Дом без книг подобен комнате без окон»
            </p>
            <p className="text-[11px]" style={{color: 'var(--site-text-muted)'}}>
              Только никнейм и пароль · Без почты и лишних анкет
            </p>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            {/* Compact Brand Header on Mobile / Tablet */}
            <div className="flex lg:hidden items-center justify-between mb-6">
              <BrandLogo size="md" />
              <Sparkles className="w-4 h-4 opacity-50" />
            </div>

            {/* Mode Switcher */}
            <div
              className="inline-flex p-1 rounded-2xl border mb-6"
              style={{
                backgroundColor: 'var(--site-bg)',
                borderColor: 'var(--site-border)',
              }}
            >
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  mode === 'login' ? 'shadow-xs' : 'opacity-65 hover:opacity-100'
                }`}
                style={
                  mode === 'login'
                    ? {
                        backgroundColor: 'var(--site-surface)',
                        color: 'var(--site-text)',
                      }
                    : undefined
                }
              >
                Вход в аккаунт
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  mode === 'register' ? 'shadow-xs' : 'opacity-65 hover:opacity-100'
                }`}
                style={
                  mode === 'register'
                    ? {
                        backgroundColor: 'var(--site-surface)',
                        color: 'var(--site-text)',
                      }
                    : undefined
                }
              >
                Создать аккаунт
              </button>
            </div>

            <div className="mb-6">
              <h1 className="font-display text-3xl font-semibold">
                {mode === 'login' ? 'С возвращением на полки' : 'Откройте свою библиотеку'}
              </h1>
              <p className="text-xs mt-1.5" style={{color: 'var(--site-text-muted)'}}>
                {mode === 'login'
                  ? 'Введите никнейм и пароль, чтобы восстановить ваши книги, заметки и оформление.'
                  : 'Придумайте уникальный никнейм и пароль — почта и номер телефона не требуются.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nickname Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium" htmlFor="vellum-nickname">
                  Никнейм
                </label>
                <div
                  className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[var(--site-accent)] transition-shadow"
                  style={{
                    backgroundColor: 'var(--site-bg)',
                    borderColor: 'var(--site-border)',
                  }}
                >
                  <User className="w-4 h-4 opacity-55 shrink-0" />
                  <input
                    id="vellum-nickname"
                    type="text"
                    autoComplete="username"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Например, Alice_Reader"
                    className="w-full bg-transparent text-sm outline-none"
                    maxLength={32}
                    required
                  />
                  {mode === 'register' && nickname.trim().length > 0 && (
                    <span className="shrink-0">
                      {nickChecking ? (
                        <Loader2 className="w-4 h-4 animate-spin opacity-55" />
                      ) : nickValidation.valid && nickAvailable === true ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : !nickValidation.valid || nickAvailable === false ? (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      ) : null}
                    </span>
                  )}
                </div>

                {mode === 'register' && nickname.trim().length > 0 && (
                  <div className="text-[11px] flex items-center gap-1.5">
                    {!nickValidation.valid ? (
                      <span className="text-rose-600 dark:text-rose-400">{nickValidation.error}</span>
                    ) : nickChecking ? (
                      <span style={{color: 'var(--site-text-muted)'}}>Проверяем доступность…</span>
                    ) : nickAvailable === true ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Никнейм свободен
                      </span>
                    ) : nickAvailable === false ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        Этот никнейм уже занят — придумайте другой
                      </span>
                    ) : null}
                  </div>
                )}
                {mode === 'register' && nickname.trim().length === 0 && (
                  <p className="text-[11px]" style={{color: 'var(--site-text-muted)'}}>
                    От 2 до 32 символов: буквы, цифры и символы . _ -
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium" htmlFor="vellum-password">
                  Пароль
                </label>
                <div
                  className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[var(--site-accent)] transition-shadow"
                  style={{
                    backgroundColor: 'var(--site-bg)',
                    borderColor: 'var(--site-border)',
                  }}
                >
                  <Lock className="w-4 h-4 opacity-55 shrink-0" />
                  <input
                    id="vellum-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                    className="w-full bg-transparent text-sm outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="p-1 rounded-lg opacity-65 hover:opacity-100 transition-opacity shrink-0"
                    title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength meter & hints in register mode */}
                {mode === 'register' && password.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{color: 'var(--site-text-muted)'}}>Надёжность пароля</span>
                      <span className="font-medium">{pwStrength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full transition-colors ${
                            pwStrength.score >= step
                              ? strengthColors[pwStrength.score]
                              : 'bg-black/10 dark:bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    {pwStrength.hints.length > 0 && (
                      <p className="text-[11px]" style={{color: 'var(--site-text-muted)'}}>
                        Подсказка: {pwStrength.hints[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={submitting || (mode === 'register' && nickAvailable === false)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-medium transition-all active:scale-[0.99] disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--site-accent)',
                    color: 'var(--site-accent-contrast)',
                  }}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'register' ? 'Создать аккаунт' : 'Войти'}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="w-full py-2.5 px-4 rounded-xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{borderColor: 'var(--site-border)'}}
                >
                  {mode === 'login' ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}
                </button>
              </div>
            </form>
          </div>

          <div
            className="mt-6 pt-4 border-t flex items-start gap-2.5 text-[11px] leading-relaxed"
            style={{borderColor: 'var(--site-border)', color: 'var(--site-text-muted)'}}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 opacity-75" />
            <p>
              Пароль защищён криптографическим хешированием с солью. Библиотека и файлы каждого аккаунта хранятся изолированно на вашем устройстве (IndexedDB) — для переноса между устройствами всегда доступен экспорт резервной копии `.chitay.zip` в Настройках.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
