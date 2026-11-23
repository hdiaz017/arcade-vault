import { notFound } from "next/navigation";
import PlayerClient from "@/components/player-client";
import { GAMES, getGame } from "@/lib/data";

// Igual que el detalle: 404 real para ids desconocidos (params fuera de Suspense).
export const instant = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function PlayPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return <PlayerClient gameId={game.id} title={game.title} />;
}
