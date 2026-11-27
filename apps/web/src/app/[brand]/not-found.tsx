import { getT } from '@/server/locale';
import { NotFoundLinks } from '@/components/store/NotFoundLinks';

/** Branded 404 inside the brand layout (header, footer and theme come from [brand]/layout.tsx). */
export default async function BrandNotFound() {
  const t = await getT();
  return (
    <section className="wrap nf" aria-labelledby="nf-h">
      <p className="nf-code">404</p>
      <h1 id="nf-h" className="nf-h">
        {t('nfTitle')}
      </h1>
      <p className="nf-p">{t('nfBody')}</p>
      <NotFoundLinks track={t('trackOrder')} home={t('home')} />
    </section>
  );
}
