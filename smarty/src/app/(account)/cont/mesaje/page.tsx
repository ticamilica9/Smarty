export const metadata = {
  title: "Mesaje",
  description: "Conversatiile tale cu vanzatorii si cumparatorii.",
}

export default function MessagesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Mesaje</h1>
      <p className="mt-1 text-muted-foreground">
        Conversatiile tale cu vanzatorii si cumparatorii.
      </p>

      <div className="mt-8 rounded-lg border p-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
          <div className="size-8 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
          </div>
        </div>
        <h3 className="mt-4 font-medium">Nu ai niciun mesaj.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Mesajele vor aparea aici dupa ce intri in contact cu un vanzator.
        </p>
      </div>
    </div>
  )
}
