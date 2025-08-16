import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatPageClient from './chat-page-client'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return <ChatPageClient />
}
   