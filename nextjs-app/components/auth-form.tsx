'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Recycle } from 'lucide-react'

/** Only allow same-site relative redirects. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/classify'
}

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (isSignUp && name.trim().length < 2) return setError('Please enter your name (at least 2 characters).')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (isSignUp && password !== confirm) return setError('Passwords do not match.')

    setLoading(true)
    const { error } = isSignUp
      ? await authClient.signUp.email({ email: email.trim(), password, name: name.trim() })
      : await authClient.signIn.email({ email: email.trim(), password })
    setLoading(false)

    if (error) {
      setError(error.message ?? 'Something went wrong. Please try again.')
      return
    }

    toast.success(isSignUp ? 'Account created' : 'Signed in')
    router.push(next)
    router.refresh()
  }

  const otherHref = `${isSignUp ? '/sign-in' : '/sign-up'}${searchParams.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`

  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10" aria-label="SmartWaste home">
            <Recycle className="h-6 w-6 text-primary" />
          </Link>
          <CardTitle className="text-2xl">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Sign up to classify waste and track your results'
              : 'Sign in to your SmartWaste account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Enter your name"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'}
              />
            </div>
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                />
              </div>
            )}

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Link href={otherHref} className="text-primary font-medium underline-offset-4 hover:underline">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
          {isSignUp && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              New accounts are General Users. An administrator can grant Collection Staff or Admin access.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
