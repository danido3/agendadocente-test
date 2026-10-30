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
        for title,reason in [('Convocazione personale ATA','tipo_non_supportato')]:
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
        sensitive=d.ROOT+'/wp-content/uploads/GLO.pdf'
        fixture[url]=f'<main><article class="article-wrapper"><a href="{pdf}">a</a><a href="{sensitive}">allegato</a></article></main>'.encode()
        item=d.analyze(80,'Convocazione collegio docenti',url,fixture.__getitem__)
        self.assertEqual(item['esito'],'incerta')
        self.assertEqual(len(item['appuntamenti']),1)
        self.assertIn('dati_sensibili',item['motivi'])
        fixture[url]=f'<main><article class="article-wrapper"><a href="{pdf}">a</a></article></main>'.encode()
        fixture[pdf]=b'not a PDF'
        item=d.analyze(80,'Convocazione collegio docenti',url,fixture.__getitem__)
        self.assertEqual(item['esito'],'incerta')
        self.assertFalse(item['lettura_completa'])

    def test_ambiguous_dates_rejected(self):
        from estrai_riunioni_generali import single_general_event
        self.assertIsNone(single_general_event('Collegio docenti',[(1,'docenti 29 ottobre 2026 30 ottobre 2026 dalle 15:00 alle 17:00')]))

if __name__=='__main__': unittest.main()

class PersonalRulesTest(unittest.TestCase):
    def test_requested_categories(self):
        from regole_impegni import categoria, classi_in
        for title,cat in [('Convocazione GLO PEI','glo'),('Calendario scrutini finali','scrutini'),('Assemblea d’Istituto corso diurno','assemblea_diurna'),('Nomina coordinatori consigli di classe',None)]:
            self.assertEqual(categoria(title),cat)
        self.assertEqual(classi_in('12 A MAT 4 B MATA 2 B MAT'),[])
        self.assertEqual(classi_in('2ª A MAT e 4B MAT'),['2 A MAT','4 B MAT'])

    def test_glo_privacy_multiple_events_and_rectification(self):
        import json
        url=d.ROOT+'/circolare/test/'
        pdf=d.ROOT+'/wp-content/uploads/GLO.pdf'
        with fitz.open() as doc:
            p=doc.new_page()
            p.insert_text((50,50),'GLO - NomeFittizio RiservatezzaTest\n2 A MAT 10 ottobre 2026 dalle 15:00 alle 15:30\n2 A MAT 10 ottobre 2026 dalle 15:30 alle 16:00\n2 B MAT 10 ottobre 2026 dalle 16:00 alle 16:30\nRettifica della circolare n. 50')
            raw=doc.tobytes()
        fixture={url:f'<main><article class="article-wrapper"><a href="{pdf}">GLO</a></article></main>'.encode(),pdf:raw}
        item=d.analyze(50,'Convocazione GLO PEI',url,fixture.__getitem__)
        self.assertEqual(len(item['appuntamenti']),2)
        self.assertNotIn('NomeFittizio',json.dumps(item))
        self.assertNotIn('RiservatezzaTest',json.dumps(item))
        changed=d.analyze(52,'Rettifica calendario GLO',url,fixture.__getitem__)
        self.assertEqual(changed['appuntamenti'],[])
        self.assertEqual(len(changed['variazioni_candidate']),2)
        self.assertEqual(changed['riferimenti_circolari'],[50])
        self.assertEqual(changed['esito'],'incerta')

    def test_incomplete_and_general(self):
        from regole_impegni import estrai
        events,inc=estrai('',[(1,'4 A MAT 10 ottobre 2026 ore 15:00')],'glo')
        self.assertFalse(events); self.assertTrue(inc)
        events,inc=estrai('',[(1,'Assemblea il 10 ottobre 2026 dalle 10:00 alle 12:00')],'assemblea_diurna')
        self.assertEqual(len(events),1)
