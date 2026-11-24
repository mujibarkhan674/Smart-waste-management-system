import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ROLE_LABELS, type UserRole } from '@/lib/types'

export function AccessDenied({ role, required }: { role: UserRole; required: UserRole[] }) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Access restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is available to {required.map((r) => ROLE_LABELS[r]).join(' and ')} accounts. You are signed in
            as <strong>{ROLE_LABELS[role]}</strong>. Ask an administrator to change your role if you need access.
          </p>
        </div>
        <Button asChild>
          <Link href="/classify">Go to Waste Classification</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
