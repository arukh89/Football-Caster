import { redirect } from 'next/navigation';

export default function Page(): never {
  redirect('/market?view=list');
}
