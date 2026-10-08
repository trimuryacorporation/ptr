import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteOrigin, publicPages, pageSchema } from './seo-config';

export default function PageSeo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = pathname.replace(/\/$/, '') || '/';
    const page = publicPages[path];
    function meta(attribute, name, content) {
      let tag = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, name); document.head.appendChild(tag); }
      tag.content = content;
    }
    document.title = page?.title || 'Trimurya | Recording Workspace';
    meta('name','robots',page ? 'index, follow' : 'noindex, follow');
    meta('name','description',page?.description || 'Trimurya Corporation recording workspace.');
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (page) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = siteOrigin + path;
      for (const [name,value] of Object.entries({'og:type':'website','og:site_name':'Trimurya Corporation','og:title':page.title,'og:description':page.description,'og:url':siteOrigin+path})) meta('property',name,value);
      meta('name','twitter:card','summary');
      meta('name','twitter:title',page.title);
      meta('name','twitter:description',page.description);
    } else {
      canonical?.remove();
      document.head.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]').forEach(tag => tag.remove());
    }
    let structured = document.getElementById('page-structured-data');
    if (page) {
      if (!structured) { structured = document.createElement('script'); structured.id = 'page-structured-data'; structured.type = 'application/ld+json'; document.head.appendChild(structured); }
      structured.textContent = JSON.stringify(pageSchema(path));
    } else structured?.remove();
  }, [pathname]);
  return null;
}
