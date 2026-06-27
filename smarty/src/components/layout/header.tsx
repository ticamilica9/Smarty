import { auth } from "@/server/auth"
import { HeaderClient } from "./header-client"

export async function Header() {
  const session = await auth()
  const user = session?.user ?? null

  return <HeaderClient user={user} />
}
