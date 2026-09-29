import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Work for All · Smart Stock', description: 'Pilotage de stock pour Le Repas, Bienne' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="fr"><body>{children}</body></html>; }
