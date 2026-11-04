import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/hooks/useAuth";
import { applyServerErrors, normalizeApiError } from "@/lib/errors";
import { loginSchema, type LoginForm } from "@/lib/schemas";
import { useAuthStore } from "@/stores/authStore";
import { useEmpresaStore } from "@/stores/empresaStore";

export function LoginPage() {
  const { login } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const empresa = useEmpresaStore((state) => state.empresa);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (accessToken && empresa) return <Navigate to="/" replace />;
  if (accessToken && !empresa) return <Navigate to="/seleccionar-empresa" replace />;

  async function onSubmit(values: LoginForm) {
    try {
      await login(values.email, values.password);
    } catch (error) {
      applyServerErrors(error, setError);
      toast.error(normalizeApiError(error).detail);
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black tracking-wide">ALMACÉN ERP</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Inventario permanente
              </p>
            </div>
          </div>
          <h1 className="mt-16 max-w-lg text-4xl font-black leading-[1.1] tracking-tight">
            Controla tu inventario con precisión{" "}
            <span className="text-emerald-400">SUNAT.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
            Kardex valorizado, Promedio Ponderado y FIFO, multiempresa y
            multialmacén, con libros PLE 12.1 y 13.1 listos para validar.
          </p>
          <div className="mt-10 grid max-w-lg gap-3">
            {[
              "Kardex inmutable y trazable por almacén, lote y serie",
              "Motor de valuación con bloqueo pesimista y stock no negativo",
              "Generación y validación previa de PLE 12.1 / 13.1",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-600">
          ERP de almacén · Perú · PCGE 2019/2020
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-950 text-emerald-400">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">ALMACÉN ERP</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Inventario permanente
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-soft sm:p-9">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
              Acceso al sistema
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Inicia sesión
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Usa tu correo corporativo para entrar al módulo de almacén.
            </p>

            <form className="mt-7 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <Field
                label="Correo electrónico"
                htmlFor="email"
                error={errors.email?.message}
                required
              >
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@empresa.pe"
                    className="pl-9"
                    invalid={Boolean(errors.email)}
                    {...register("email")}
                  />
                </div>
              </Field>

              <Field
                label="Contraseña"
                htmlFor="password"
                error={errors.password?.message}
                required
              >
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    invalid={Boolean(errors.password)}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                Entrar al módulo
              </Button>
            </form>

            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Demo local
              </p>
              <p className="mt-1 font-mono text-xs text-slate-600">
                admin@demo.pe · admin12345
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
