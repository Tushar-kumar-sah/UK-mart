import { redirect } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  if (!id) {
    redirect('/');
  }
  redirect(`/?product=${encodeURIComponent(id)}`);
}
