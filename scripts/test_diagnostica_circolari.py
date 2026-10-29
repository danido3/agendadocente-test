import unittest
import fitz
import diagnostica_circolari as d


def archive(cards,nav=''):
    return ('<main><input name="anno-scolastico" value="2026" checked>'+''.join(
        f'<a class="presentation-card-link" href="/circolare/circolare-n-{n}/"><article><h2>Circolare n. {n} - {t}</h2></article></a>' for n,t in cards)
        +f'<nav class="pagination-wrapper">{nav}</nav></main>').encode()


class DiagnosticTest(unittest.TestCase):
    def test_all_pages_filter_and_no_menu(self):
        first=archive([(1,'Avviso')],'<a href="/circolare/page/2/">2</a>')
        second=archive([(2,'Convocazione collegio docenti')])
        fixtures={d.ARCHIVE:first,b'bad':b''}
        fixtures[d.ROOT+'/circolare/page/2/?anno-scolastico=2026']=second
        found,pages,errors=d.crawl(fixtures.__getitem__)
        self.assertEqual((len(found),len(pages),errors),(2,2,[]))
        self.assertIsNone(d.archive_page(d.ROOT+'/circolare/page/2/?anno-scolastico=2025'))
        self.assertIsNone(d.archive_page('https://example.com/circolare/page/2/'))

    def test_councils_plural_and_singular(self):
        for title in ['Convocazione Consigli di Classe','Consiglio di classe']:
            self.assertEqual(d.category(title),'consigli_di_classe')

    def test_missing_archive_is_partial(self):
        found,pages,errors=d.crawl(lambda _: b'<main>Login</main>')
        self.assertFalse(found)
        self.assertTrue(errors)

    def test_private_and_unsupported_no_download(self):
        def forbidden(_): self.fail('Non deve scaricare documenti')
        for title,reason in [('Convocazione GLO','dati_sensibili'),('Convocazione personale ATA','tipo_non_supportato'),('Rettifica collegio docenti','rettifica')]:
            item=d.analyze(1,title,d.ROOT+'/circolare/x/',forbidden)
            self.assertIn(reason,item['motivi'])
            self.assertEqual(item['esito'],'esclusa')

    def test_pdf_complete_dedup_and_privacy(self):
        with fitz.open() as doc:
            page=doc.new_page()
            page.insert_text((50,50),'Tutti i docenti: collegio docenti il 29 ottobre 2026 dalle 15:00 alle 17:00.')
            raw=doc.tobytes()
        url=d.ROOT+'/circolare/x/'
        pdf=d.ROOT+'/wp-content/uploads/a.pdf'
        fixture={url:f'<main><article class="article-wrapper"><a href="{pdf}">a</a><a href="{pdf}">b</a></article></main>'.encode(),pdf:raw}
        item=d.analyze(80,'Convocazione collegio docenti',url,fixture.__getitem__)
        self.assertEqual(item['esito'],'completa')
        self.assertEqual(len(item['appuntamenti']),1)
        self.assertEqual(item['documenti'],1)
        self.assertNotIn('url',item)
        self.assertNotIn('titolo',item)
        fixture[pdf]=b'not a PDF'
        item=d.analyze(80,'Convocazione collegio docenti',url,fixture.__getitem__)
        self.assertEqual(item['esito'],'incerta')
        self.assertFalse(item['lettura_completa'])

    def test_ambiguous_dates_rejected(self):
        from estrai_riunioni_generali import single_general_event
        self.assertIsNone(single_general_event('Collegio docenti',[(1,'docenti 29 ottobre 2026 30 ottobre 2026 dalle 15:00 alle 17:00')]))

if __name__=='__main__': unittest.main()
