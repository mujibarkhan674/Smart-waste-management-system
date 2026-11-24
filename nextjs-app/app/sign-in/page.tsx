import { Suspense } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'

export const metadata = { title: 'Sign in - Smart Waste Management' }

export default async function SignInPage() {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders }).catch(() => null)
  if (session?.user) redirect('/classify')
  return (
    <Suspense>
      <AuthForm mode="sign-in" />
    </Suspense>
  )
}
