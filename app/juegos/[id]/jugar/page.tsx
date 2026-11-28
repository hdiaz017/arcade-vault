import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AsteroidsPlayer from "@/components/asteroids-player";
import PlayerClient from "@/components/player-client";
import { GAMES, getGame } from "@/lib/data";

// Igual que el detalle: 404 real para ids desconocidos (params fuera de Suspense).
export const instant = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  return { title: game ? `Jugar ${game.title}` : "Juego no encontrado" };
}

export default async function PlayPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  // Asteroids es el único juego real; el resto usa la demo.
  if (game.id === "asteroids") {
    return <AsteroidsPlayer gameId={game.id} title={game.title} />;
  }

  return <PlayerClient gameId={game.id} title={game.title} />;
}
